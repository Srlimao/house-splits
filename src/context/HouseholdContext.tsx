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
import {
  INITIAL_HOUSEHOLD,
  INITIAL_PROFILES,
  INITIAL_CATEGORIES,
  INITIAL_RULES,
  INITIAL_BILLS,
} from '../lib/initialData';
import { notifyNewBill, notifyPaymentMade } from '../lib/webhooks';

interface HouseholdContextType {
  household: Household;
  profiles: Profile[];
  categories: BillCategory[];
  splitRules: CategorySplitRule[];
  bills: Bill[];
  activeProfile: Profile;
  setActiveProfileId: (id: string) => void;
  addBill: (billData: Omit<Bill, 'id' | 'createdAt'>) => Promise<Bill>;
  removeBill: (billId: string) => void;
  togglePaidToProvider: (billId: string) => void;
  markSplitPaidToAdmin: (billId: string, profileId: string, notes?: string) => void;
  confirmSplitPayment: (billId: string, profileId: string) => void;
  updateSplitRules: (categoryId: string, updatedShares: { profileId: string; percentage: number }[]) => void;
  updateHousehold: (updated: Partial<Household>) => void;
  addProfile: (profile: Omit<Profile, 'id' | 'householdId'>) => Profile;
  updateProfile: (id: string, updates: Partial<Profile>) => void;
  removeProfile: (id: string) => void;
  regenerateInviteCode: () => string;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

const LS_BILLS_KEY = 'housesplits_bills_v1';
const LS_RULES_KEY = 'housesplits_rules_v1';
const LS_HOUSE_KEY = 'housesplits_house_v1';
const LS_PROFILES_KEY = 'housesplits_profiles_v1';

export const HouseholdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [household, setHousehold] = useState<Household>(() => {
    const saved = localStorage.getItem(LS_HOUSE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_HOUSEHOLD;
  });

  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem(LS_PROFILES_KEY);
    return saved ? JSON.parse(saved) : INITIAL_PROFILES;
  });

  const [categories] = useState<BillCategory[]>(INITIAL_CATEGORIES);

  const [splitRules, setSplitRules] = useState<CategorySplitRule[]>(() => {
    const saved = localStorage.getItem(LS_RULES_KEY);
    return saved ? JSON.parse(saved) : INITIAL_RULES;
  });

  const [bills, setBills] = useState<Bill[]>(() => {
    const saved = localStorage.getItem(LS_BILLS_KEY);
    return saved ? JSON.parse(saved) : INITIAL_BILLS;
  });

  const [activeProfileId, setActiveProfileId] = useState<string>('user-admin');

  useEffect(() => {
    localStorage.setItem(LS_BILLS_KEY, JSON.stringify(bills));
  }, [bills]);

  useEffect(() => {
    localStorage.setItem(LS_RULES_KEY, JSON.stringify(splitRules));
  }, [splitRules]);

  useEffect(() => {
    localStorage.setItem(LS_HOUSE_KEY, JSON.stringify(household));
  }, [household]);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  const addBill = async (billData: Omit<Bill, 'id' | 'createdAt'>): Promise<Bill> => {
    const newBill: Bill = {
      ...billData,
      id: `bill-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setBills((prev) => [newBill, ...prev]);

    // Dispatch webhook in the background if configured
    const cat = categories.find((c) => c.id === newBill.categoryId);
    notifyNewBill(household, newBill, cat?.name || 'Utility', profiles).catch(() => {});

    return newBill;
  };

  const removeBill = (billId: string) => {
    setBills((prev) => prev.filter((b) => b.id !== billId));
  };

  const togglePaidToProvider = (billId: string) => {
    setBills((prev) =>
      prev.map((b) => {
        if (b.id !== billId) return b;
        const nextPaid = !b.paidToProvider;
        return {
          ...b,
          paidToProvider: nextPaid,
          paidToProviderAt: nextPaid ? new Date().toISOString() : undefined,
        };
      })
    );
  };

  const markSplitPaidToAdmin = (billId: string, profileId: string, notes?: string) => {
    setBills((prev) =>
      prev.map((b) => {
        if (b.id !== billId) return b;
        const splits = b.splits.map((s) => {
          if (s.profileId !== profileId) return s;
          return {
            ...s,
            status: 'paid_to_admin' as SplitStatus,
            markedPaidAt: new Date().toISOString(),
            notes: notes || s.notes,
          };
        });
        return { ...b, splits };
      })
    );

    const payer = profiles.find((p) => p.id === profileId);
    const targetBill = bills.find((b) => b.id === billId);
    const splitAmount = targetBill?.splits.find((s) => s.profileId === profileId)?.amountDue || 0;

    if (payer) {
      notifyPaymentMade(household, payer.fullName, splitAmount, household.currency).catch(() => {});
    }
  };

  const confirmSplitPayment = (billId: string, profileId: string) => {
    setBills((prev) =>
      prev.map((b) => {
        if (b.id !== billId) return b;
        const splits = b.splits.map((s) => {
          if (s.profileId !== profileId) return s;
          return {
            ...s,
            status: 'confirmed_by_admin' as SplitStatus,
            confirmedPaidAt: new Date().toISOString(),
          };
        });
        return { ...b, splits };
      })
    );
  };

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

  useEffect(() => {
    localStorage.setItem(LS_PROFILES_KEY, JSON.stringify(profiles));
  }, [profiles]);

  const updateHousehold = (updated: Partial<Household>) => {
    setHousehold((prev) => ({ ...prev, ...updated }));
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
    const profile: Profile = {
      ...newMember,
      id: `mate-${Date.now()}`,
      householdId: household.id,
      isActive: true,
    };

    setProfiles((prev) => [...prev, profile]);

    // Add default split rules for this new roommate across all existing categories
    setSplitRules((prev) => {
      const newRules: CategorySplitRule[] = categories.map((cat) => ({
        id: `r-${cat.id}-${profile.id}-${Date.now()}`,
        categoryId: cat.id,
        profileId: profile.id,
        defaultPercentage: 0, // Admin can configure percentage in Split Rules
      }));
      return [...prev, ...newRules];
    });

    return profile;
  };

  const updateProfile = (id: string, updates: Partial<Profile>) => {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const removeProfile = (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    setSplitRules((prev) => prev.filter((r) => r.profileId !== id));
    if (activeProfileId === id) {
      setActiveProfileId('user-admin');
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
        addBill,
        removeBill,
        togglePaidToProvider,
        markSplitPaidToAdmin,
        confirmSplitPayment,
        updateSplitRules,
        updateHousehold,
        addProfile,
        updateProfile,
        removeProfile,
        regenerateInviteCode,
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
