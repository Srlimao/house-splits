import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Household,
  Profile,
  BillCategory,
  CategorySplitRule,
  Bill,
  BillSplit,
  SplitStatus,
} from '../types';
import { INITIAL_CATEGORIES } from '../lib/initialData';
import { apiClient } from '../lib/apiClient';
import {
  LS_RULES_KEY,
  LS_HOUSE_KEY,
  safeSetLocalStorage,
  safeRemoveLocalStorage,
  saveBillsToCache,
  normalizeHousehold,
  loadCachedBills,
  loadCachedHousehold,
  loadCachedSplitRules,
  reconcileSplitRules,
} from './householdStorageAndNormalizers';
import { useAuthSessionState, AuthUser } from './useAuthSessionState';
import { useBillMutations } from './useBillMutations';
import { useHouseholdSync } from './useHouseholdSync';

interface HouseholdContextType {
  household: Household;
  profiles: Profile[];
  categories: BillCategory[];
  splitRules: CategorySplitRule[];
  bills: Bill[];
  activeProfile: Profile;
  setActiveProfileId: (id: string) => void;
  inspectingHouseholdId: string | null;
  setInspectingHouseholdId: (id: string | null) => void;
  addBill: (billData: Omit<Bill, 'id' | 'createdAt'>) => Promise<Bill>;
  removeBill: (billId: string) => void;
  togglePaidToProvider: (billId: string) => void;
  markSplitPaidToAdmin: (billId: string, profileId: string, notes?: string) => void;
  confirmSplitPayment: (billId: string, profileId: string) => void;
  setSplitStatus: (
    billId: string,
    profileId: string,
    status: SplitStatus,
    options?: { notes?: string; paidAt?: string; confirmedAt?: string }
  ) => Promise<void>;
  revertSplitToPending: (billId: string, profileId: string) => Promise<void>;
  confirmAllPendingSplits: () => Promise<number>;
  updateBillSplits: (billId: string, updatedSplits: BillSplit[], newTotalAmount?: number) => Promise<void>;
  updateBill: (billId: string, updates: Partial<Bill>) => Promise<void>;
  updateSplitRules: (categoryId: string, updatedShares: { profileId: string; percentage: number }[]) => void;
  updateHousehold: (updated: Partial<Household>) => void;
  addProfile: (profile: Omit<Profile, 'id' | 'householdId'>) => Profile;
  updateProfile: (id: string, updates: Partial<Profile>) => void;
  removeProfile: (id: string) => Promise<void>;
  regenerateInviteCode: () => string;
  currentUser: AuthUser | null;
  isAuthLoading: boolean;
  isSystemManager: boolean;
  logout: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export const HouseholdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [household, setHousehold] = useState<Household>(() => loadCachedHousehold());
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<BillCategory[]>(INITIAL_CATEGORIES);
  const [splitRules, setSplitRules] = useState<CategorySplitRule[]>(() => loadCachedSplitRules());
  const [bills, setBills] = useState<Bill[]>(() => loadCachedBills());
  const [inspectingHouseholdId, setInspectingHouseholdId] = useState<string | null>(null);

  const {
    currentUser,
    isAuthLoading,
    isSystemManager,
    activeProfile,
    setActiveProfileId,
    logout,
  } = useAuthSessionState(profiles, household.id);

  useHouseholdSync({
    currentUser,
    inspectingHouseholdId,
    categories,
    setHousehold,
    setProfiles,
    setCategories,
    setSplitRules,
    setBills,
  });

  const billMutations = useBillMutations({
    household,
    profiles,
    categories,
    bills,
    setBills,
    activeProfile,
    currentUser,
  });

  useEffect(() => {
    safeRemoveLocalStorage('housesplits_profiles_v1');
  }, []);

  useEffect(() => {
    saveBillsToCache(bills);
  }, [bills]);

  useEffect(() => {
    safeSetLocalStorage(LS_RULES_KEY, splitRules);
  }, [splitRules]);

  useEffect(() => {
    safeSetLocalStorage(LS_HOUSE_KEY, household);
  }, [household]);

  const updateSplitRules = (
    categoryId: string,
    updatedShares: { profileId: string; percentage: number }[]
  ) => {
    setSplitRules((prev) => {
      const filtered = prev.filter((r) => r.categoryId !== categoryId);
      const newlyCreated: CategorySplitRule[] = updatedShares.map((s) => ({
        id: `r-${categoryId}-${s.profileId}-${Date.now()}`,
        categoryId,
        profileId: s.profileId,
        defaultPercentage: s.percentage,
      }));
      return [...filtered, ...newlyCreated];
    });
  };

  const updateHousehold = (updated: Partial<Household>) => {
    setHousehold((prev) => {
      const merged = normalizeHousehold({ ...prev, ...updated }, prev);
      apiClient.households
        .update(merged.id, {
          name: merged.name,
          currency: merged.currency,
          invite_code: merged.inviteCode,
          admin_payment_info: merged.adminPaymentInfo,
          webhook_settings: merged.webhookSettings,
        })
        .catch((err) => console.warn('Could not persist household update to D1:', err));
      return merged;
    });
  };

  const regenerateInviteCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'HOUSE-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    updateHousehold({ inviteCode: code });
    return code;
  };

  const addProfile = (newMember: Omit<Profile, 'id' | 'householdId'>): Profile => {
    const newId = crypto.randomUUID();
    const profile: Profile = { ...newMember, id: newId, householdId: household.id, isActive: true };
    setProfiles((prev) => [...prev, profile]);

    apiClient.profiles
      .create({
        id: newId,
        household_id: household.id,
        full_name: newMember.fullName,
        email: newMember.email,
        role: newMember.role || 'member',
        avatar_url: newMember.avatarUrl,
      })
      .catch((err) => console.warn('Could not persist profile to D1:', err));

    setSplitRules((prev) => reconcileSplitRules(prev, [...profiles, profile], categories));
    return profile;
  };

  const updateProfile = (id: string, updates: Partial<Profile>) => {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    apiClient.profiles.update(id, updates).catch(() => {});
  };

  const removeProfile = async (id: string) => {
    const nextProfiles = profiles.filter((p) => p.id !== id);
    setProfiles(nextProfiles);
    setSplitRules((prev) => reconcileSplitRules(prev, nextProfiles, categories));
    setBills((prev) =>
      prev.map((b) => ({ ...b, splits: (b.splits || []).filter((s) => s.profileId !== id) }))
    );

    if (activeProfile.id === id) {
      const nextAdmin = nextProfiles.find((p) => p.role === 'admin');
      setActiveProfileId(nextAdmin ? nextAdmin.id : nextProfiles[0]?.id || '');
    }

    try {
      await apiClient.profiles.delete(id);
    } catch (err) {
      console.warn('apiClient delete error:', err);
    }
  };

  return (
    <HouseholdContext.Provider
      value={{
        household,
        profiles,
        categories,
        splitRules,
        bills,
        activeProfile,
        setActiveProfileId,
        inspectingHouseholdId,
        setInspectingHouseholdId,
        ...billMutations,
        updateSplitRules,
        updateHousehold,
        addProfile,
        updateProfile,
        removeProfile,
        regenerateInviteCode,
        currentUser,
        isAuthLoading,
        isSystemManager,
        logout,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
};

export const useHousehold = () => {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
};
