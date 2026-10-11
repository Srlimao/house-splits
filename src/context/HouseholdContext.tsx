import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Household,
  Profile,
  BillCategory,
  CategorySplitRule,
  Bill,
  BillSplit,
  SplitStatus,
  UserRole,
} from '../types';
import {
  INITIAL_HOUSEHOLD,
  INITIAL_CATEGORIES,
  INITIAL_RULES,
  INITIAL_BILLS,
} from '../lib/initialData';
import { notifyNewBill, notifyPaymentMade } from '../lib/webhooks';
import { apiClient } from '../lib/apiClient';
import { signOutUser, onAuthChange, getAuthSession } from '../lib/authService';

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
  updateBillSplits: (billId: string, updatedSplits: BillSplit[], newTotalAmount?: number) => Promise<void>;
  updateSplitRules: (categoryId: string, updatedShares: { profileId: string; percentage: number }[]) => void;
  updateHousehold: (updated: Partial<Household>) => void;
  addProfile: (profile: Omit<Profile, 'id' | 'householdId'>) => Profile;
  updateProfile: (id: string, updates: Partial<Profile>) => void;
  removeProfile: (id: string) => Promise<void>;
  regenerateInviteCode: () => string;
  currentUser: {
    id: string;
    email: string;
    role?: string;
    isSystemManager?: boolean;
    householdId?: string | null;
  } | null;
  isAuthLoading: boolean;
  isSystemManager: boolean;
  logout: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

const LS_BILLS_KEY = 'housesplits_bills_v1';
const LS_RULES_KEY = 'housesplits_rules_v1';
const LS_HOUSE_KEY = 'housesplits_house_v1';

const reconcileSplitRules = (
  currentRules: CategorySplitRule[],
  activeProfiles: Profile[],
  categoriesList: BillCategory[]
): CategorySplitRule[] => {
  if (activeProfiles.length === 0) return [];

  const activeIds = new Set(activeProfiles.map((p) => p.id));
  const validRules = currentRules.filter((r) => activeIds.has(r.profileId));

  const equalPct = Number((100 / activeProfiles.length).toFixed(1));
  const reconciled: CategorySplitRule[] = [];

  for (const cat of categoriesList) {
    const catRules = validRules.filter((r) => r.categoryId === cat.id);
    const sum = catRules.reduce((acc, r) => acc + r.defaultPercentage, 0);

    // If every active roommate has a rule and the sum is valid (~100%)
    if (catRules.length === activeProfiles.length && Math.abs(sum - 100) < 0.1) {
      reconciled.push(...catRules);
    } else {
      // Rebalance equally across all active roommates
      activeProfiles.forEach((p, idx) => {
        reconciled.push({
          id: `r-${cat.id}-${p.id}`,
          categoryId: cat.id,
          profileId: p.id,
          defaultPercentage:
            idx === 0
              ? Number((100 - equalPct * (activeProfiles.length - 1)).toFixed(1))
              : equalPct,
        });
      });
    }
  }

  return reconciled;
};

export const HouseholdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Purge legacy cached mock profiles and stale rules on initialization
  try {
    localStorage.removeItem('housesplits_profiles_v1');
    localStorage.removeItem(LS_RULES_KEY);
  } catch {
    // ignore
  }

  const [household, setHousehold] = useState<Household>(() => {
    const saved = localStorage.getItem(LS_HOUSE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_HOUSEHOLD;
  });

  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [categories, setCategories] = useState<BillCategory[]>(INITIAL_CATEGORIES);

  const [splitRules, setSplitRules] = useState<CategorySplitRule[]>([]);

  const [bills, setBills] = useState<Bill[]>(() => {
    try {
      const saved = localStorage.getItem(LS_BILLS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const MOCK_IDS = new Set(['bill-1', 'bill-2', 'bill-3', 'bill-sep-rent', 'bill-sep-elec']);
          return parsed.filter((b: any) => !MOCK_IDS.has(b.id));
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [activeProfileId, setActiveProfileId] = useState<string>('user-admin');
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
    role?: string;
    isSystemManager?: boolean;
    householdId?: string | null;
  } | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Auth session watcher (runs once on mount)
  useEffect(() => {
    let isMounted = true;

    getAuthSession()
      .then((session) => {
        if (!isMounted) return;
        if (session?.user) {
          const userEmail = session.user.email?.toLowerCase();
          const isSys = Boolean(
            session.user.isSystemManager ||
            session.user.role === 'system_manager' ||
            userEmail === 'manager@dunhas.com'
          );
          setCurrentUser({
            id: session.user.id,
            email: session.user.email || '',
            role: isSys ? 'system_manager' : session.user.role,
            isSystemManager: isSys,
            householdId: isSys ? null : session.user.householdId,
          });
        }
      })
      .finally(() => {
        if (isMounted) setIsAuthLoading(false);
      });

    const unsubscribe = onAuthChange((session) => {
      if (!isMounted) return;
      if (session?.user) {
        const userEmail = session.user.email?.toLowerCase();
        const isSys = Boolean(
          session.user.isSystemManager ||
          session.user.role === 'system_manager' ||
          userEmail === 'manager@dunhas.com'
        );
        setCurrentUser({
          id: session.user.id,
          email: session.user.email || '',
          role: isSys ? 'system_manager' : session.user.role,
          isSystemManager: isSys,
          householdId: isSys ? null : session.user.householdId,
        });
      } else {
        setCurrentUser(null);
      }
      setIsAuthLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_BILLS_KEY, JSON.stringify(bills));
  }, [bills]);

  useEffect(() => {
    localStorage.setItem(LS_RULES_KEY, JSON.stringify(splitRules));
  }, [splitRules]);

  useEffect(() => {
    localStorage.setItem(LS_HOUSE_KEY, JSON.stringify(household));
  }, [household]);

  // Sync household data from Cloudflare Native D1 via API
  useEffect(() => {
    const syncData = async () => {
      try {
        const houses = await apiClient.households.getAll();
        if (houses && houses.length > 0) {
          const dbHouse = (currentUser?.householdId && houses.find((h: any) => h.id === currentUser.householdId)) || houses[0];
          if (dbHouse?.id) {
            const dbProfiles = await apiClient.profiles.getAll(dbHouse.id);
            const dbCategories = await apiClient.categories.getAll(dbHouse.id).catch(() => []);
            let activeCategories = categories;
            if (dbCategories && dbCategories.length > 0) {
              activeCategories = dbCategories.map((c: any) => ({
                id: c.id,
                householdId: c.householdId || c.household_id || dbHouse.id,
                name: c.name,
                code: c.code,
                icon: c.icon || 'zap',
                colorHex: c.colorHex || c.color_hex || '#10b981',
              }));
              setCategories(activeCategories);
            }

            const dbBills = await apiClient.bills.getAll(dbHouse.id);
            if (dbBills) {
              setBills(dbBills);
            }
            setHousehold((prev) => ({
              ...prev,
              id: dbHouse.id,
              name: dbHouse.name || prev.name,
              currency: dbHouse.currency || prev.currency,
              inviteCode: dbHouse.invite_code || prev.inviteCode || 'MAPLE-2026',
              adminPaymentInfo: dbHouse.admin_payment_info || prev.adminPaymentInfo,
              webhookSettings: dbHouse.webhook_settings || prev.webhookSettings,
            }));

            const mappedProfiles: Profile[] = (dbProfiles || [])
              .filter((dbP) => {
                const role = dbP.role as UserRole;
                const isSys = Boolean(dbP.is_system_manager ?? dbP.isSystemManager ?? role === 'system_manager');
                return !isSys && role !== 'system_manager';
              })
              .map((dbP) => ({
                id: dbP.id,
                householdId: dbP.household_id || dbP.householdId || dbHouse.id,
                fullName: dbP.full_name || dbP.fullName || 'Roommate',
                nickname: dbP.nickname,
                email: dbP.email,
                role: (dbP.role as UserRole) || 'member',
                isSystemManager: false,
                avatarUrl: dbP.avatar_url || dbP.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&auto=format&fit=crop&q=80',
                isActive: dbP.is_active ?? dbP.isActive ?? true,
              }));

            setProfiles(mappedProfiles);

            const realAdmin = mappedProfiles.find((p) => p.role === 'admin');
            setSplitRules((prevRules) => {
              const mapped = prevRules.map((r) =>
                r.profileId === 'user-admin' && realAdmin ? { ...r, profileId: realAdmin.id } : r
              );
              return reconcileSplitRules(mapped, mappedProfiles, activeCategories);
            });

            if (realAdmin) {
              setBills((prevBills) =>
                prevBills.map((b) => ({
                  ...b,
                  createdBy: b.createdBy === 'user-admin' ? realAdmin.id : b.createdBy,
                  splits: b.splits.map((s) => (s.profileId === 'user-admin' ? { ...s, profileId: realAdmin.id } : s)),
                }))
              );
            }
          }
        }
      } catch (e) {
        console.error('Error fetching household data:', e);
      }
    };

    syncData();
  }, [currentUser?.householdId, currentUser?.id, currentUser?.email]);

  // Keep activeProfileId in sync with current logged-in user or active admin
  useEffect(() => {
    if (currentUser && !currentUser.isSystemManager) {
      const match = profiles.find(
        (p) => p.email.toLowerCase() === currentUser.email.toLowerCase() || p.id === currentUser.id
      );
      if (match) {
        if (activeProfileId !== match.id) {
          setActiveProfileId(match.id);
        }
      } else if (currentUser.id && activeProfileId !== currentUser.id) {
        setActiveProfileId(currentUser.id);
      }
    }
  }, [currentUser, profiles, activeProfileId]);

  const isSystemManager = Boolean(
    currentUser &&
    (currentUser.email?.toLowerCase() === 'manager@dunhas.com' ||
      currentUser.role === 'system_manager' ||
      currentUser.isSystemManager)
  );

  const managerProfile: Profile = {
    id: currentUser?.id || 'sys-manager',
    householdId: '',
    fullName: currentUser?.email === 'manager@dunhas.com' ? 'System Manager' : 'Admin',
    email: currentUser?.email || 'manager@dunhas.com',
    role: 'system_manager',
    isSystemManager: true,
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&auto=format&fit=crop&q=80',
    isActive: true,
  };

  const currentUserFallbackProfile: Profile | null = currentUser && !isSystemManager ? {
    id: currentUser.id,
    householdId: currentUser.householdId || household.id,
    fullName: (currentUser as any).fullName || (currentUser as any).user_metadata?.full_name || currentUser.email.split('@')[0],
    email: currentUser.email,
    role: (currentUser.role as UserRole) || 'member',
    isSystemManager: false,
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&auto=format&fit=crop&q=80',
    isActive: true,
  } : null;

  const activeProfile = isSystemManager
    ? managerProfile
    : profiles.find((p) => currentUser && (p.email.toLowerCase() === currentUser.email.toLowerCase() || p.id === currentUser.id)) ||
      profiles.find((p) => p.id === activeProfileId) ||
      currentUserFallbackProfile ||
      profiles.find((p) => p.role === 'admin') ||
      profiles[0] ||
      managerProfile;

  const addBill = async (billData: Omit<Bill, 'id' | 'createdAt'>): Promise<Bill> => {
    const newId = `bill-${Date.now()}`;
    const realAdmin = profiles.find((p) => p.role === 'admin');
    const realHouseholdId =
      household.id && household.id !== 'house-1'
        ? household.id
        : (currentUser?.householdId || household.id);
    const realCreatorId =
      activeProfile.id !== 'user-admin'
        ? activeProfile.id
        : (realAdmin?.id || activeProfile.id);

    // Resolve category ID against active categories if using legacy 'cat-...'
    let resolvedCategoryId = billData.categoryId;
    const catMatch = categories.find(
      (c) =>
        c.id === billData.categoryId ||
        c.code === billData.categoryId ||
        c.code === billData.categoryId.replace(/^cat-/, '') ||
        (c.code === 'electricity' && billData.categoryId === 'cat-elec') ||
        (c.code === 'internet' && billData.categoryId === 'cat-net')
    );
    if (catMatch) {
      resolvedCategoryId = catMatch.id;
    }

    const newBill: Bill = {
      ...billData,
      id: newId,
      householdId: realHouseholdId,
      categoryId: resolvedCategoryId,
      createdBy: realCreatorId,
      splits: billData.splits.map((s) => ({
        ...s,
        profileId: s.profileId === 'user-admin' && realAdmin ? realAdmin.id : s.profileId,
      })),
      createdAt: new Date().toISOString(),
    };

    setBills((prev) => [newBill, ...prev]);

    // Persist to Cloudflare Native D1 via API
    try {
      const persisted = await apiClient.bills.create(newBill);
      if (persisted?.id && persisted.id !== newId) {
        setBills((prev) => prev.map((b) => (b.id === newId ? { ...b, ...persisted } : b)));
      }
    } catch (err) {
      console.warn('Could not persist bill to D1:', err);
    }

    // Dispatch webhook in the background if configured
    const cat = categories.find((c) => c.id === newBill.categoryId);
    notifyNewBill(household, newBill, cat?.name || 'Utility', profiles).catch(() => {});

    return newBill;
  };

  const removeBill = (billId: string) => {
    setBills((prev) => prev.filter((b) => b.id !== billId));
    apiClient.bills.delete(billId).catch((err) => console.warn('Could not delete bill from D1:', err));
  };

  const togglePaidToProvider = (billId: string) => {
    let nextPaid = false;
    let nextPaidAt: string | undefined = undefined;

    setBills((prev) =>
      prev.map((b) => {
        if (b.id !== billId) return b;
        nextPaid = !b.paidToProvider;
        nextPaidAt = nextPaid ? new Date().toISOString() : undefined;
        return {
          ...b,
          paidToProvider: nextPaid,
          paidToProviderAt: nextPaidAt,
        };
      })
    );

    apiClient.bills.update(billId, {
      paidToProvider: nextPaid,
      paidToProviderAt: nextPaidAt,
    }).catch((err) => console.warn('Could not update bill in D1:', err));
  };

  const markSplitPaidToAdmin = (billId: string, profileId: string, notes?: string) => {
    const nowIso = new Date().toISOString();

    setBills((prev) =>
      prev.map((b) => {
        if (b.id !== billId) return b;
        const splits = b.splits.map((s) => {
          if (s.profileId !== profileId) return s;
          return {
            ...s,
            status: 'paid_to_admin' as SplitStatus,
            markedPaidAt: nowIso,
            notes: notes || s.notes,
          };
        });
        return { ...b, splits };
      })
    );

    apiClient.bills.update(billId, {
      splitUpdate: {
        profileId,
        status: 'paid_to_admin',
        markedPaidAt: nowIso,
        notes,
      },
    }).catch((err) => console.warn('Could not update split in D1:', err));

    const payer = profiles.find((p) => p.id === profileId);
    const targetBill = bills.find((b) => b.id === billId);
    const splitAmount = targetBill?.splits.find((s) => s.profileId === profileId)?.amountDue || 0;

    if (payer) {
      notifyPaymentMade(household, payer.fullName, splitAmount, household.currency).catch(() => {});
    }
  };

  const confirmSplitPayment = (billId: string, profileId: string) => {
    const nowIso = new Date().toISOString();

    setBills((prev) =>
      prev.map((b) => {
        if (b.id !== billId) return b;
        const splits = b.splits.map((s) => {
          if (s.profileId !== profileId) return s;
          return {
            ...s,
            status: 'confirmed_by_admin' as SplitStatus,
            confirmedPaidAt: nowIso,
          };
        });
        return { ...b, splits };
      })
    );

    apiClient.bills.update(billId, {
      splitUpdate: {
        profileId,
        status: 'confirmed_by_admin',
        confirmedPaidAt: nowIso,
      },
    }).catch((err) => console.warn('Could not confirm split in D1:', err));
  };

  const updateBillSplits = async (billId: string, updatedSplits: BillSplit[], newTotalAmount?: number) => {
    const realAdmin = profiles.find((p) => p.role === 'admin');
    const mappedSplits = updatedSplits.map((s) => ({
      ...s,
      profileId: s.profileId === 'user-admin' && realAdmin ? realAdmin.id : s.profileId,
    }));

    setBills((prev) =>
      prev.map((b) => {
        if (b.id !== billId) return b;
        return {
          ...b,
          totalAmount: newTotalAmount !== undefined ? newTotalAmount : b.totalAmount,
          splits: mappedSplits,
        };
      })
    );

    try {
      await apiClient.bills.update(billId, {
        splits: mappedSplits,
        totalAmount: newTotalAmount,
      });
    } catch (err) {
      console.warn('Could not update bill splits in D1:', err);
    }
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

  const updateHousehold = (updated: Partial<Household>) => {
    setHousehold((prev) => {
      const merged = { ...prev, ...updated };
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
    const profile: Profile = {
      ...newMember,
      id: newId,
      householdId: household.id,
      isActive: true,
    };

    setProfiles((prev) => [...prev, profile]);

    // Persist to Cloudflare Native D1 via API
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

    // Reconcile default split rules evenly across all active members including the new one
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
      prev.map((b) => ({
        ...b,
        splits: b.splits.filter((s) => s.profileId !== id),
      }))
    );

    if (activeProfileId === id) {
      const nextAdmin = nextProfiles.find((p) => p.role === 'admin');
      setActiveProfileId(nextAdmin ? nextAdmin.id : nextProfiles[0]?.id || '');
    }

    // Delete from Cloudflare Native D1 via API
    try {
      await apiClient.profiles.delete(id);
    } catch (err) {
      console.warn('apiClient delete error:', err);
    }
  };

  const logout = async () => {
    await signOutUser();
    setCurrentUser(null);
    if (profiles.length > 0) {
      setActiveProfileId(profiles[0].id);
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
        updateBillSplits,
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
