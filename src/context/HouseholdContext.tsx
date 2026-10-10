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
  INITIAL_PROFILES,
  INITIAL_CATEGORIES,
  INITIAL_RULES,
  INITIAL_BILLS,
} from '../lib/initialData';
import { notifyNewBill, notifyPaymentMade } from '../lib/webhooks';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
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
const LS_PROFILES_KEY = 'housesplits_profiles_v1';

export const HouseholdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [household, setHousehold] = useState<Household>(() => {
    const saved = localStorage.getItem(LS_HOUSE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_HOUSEHOLD;
  });

  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem(LS_PROFILES_KEY);
    const parsed: Profile[] = saved ? JSON.parse(saved) : INITIAL_PROFILES;
    const filtered = parsed.filter((p) => p.role !== 'system_manager' && !p.isSystemManager);
    const hasRealAdmin = filtered.some(
      (p) => p.role === 'admin' && p.email !== 'will@example.com' && p.id !== 'user-admin'
    );
    return hasRealAdmin
      ? filtered.filter(
          (p) =>
            p.email !== 'will@example.com' &&
            p.id !== 'user-admin' &&
            p.id !== 'mate-1' &&
            p.id !== 'mate-2'
        )
      : filtered;
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

  useEffect(() => {
    localStorage.setItem(LS_PROFILES_KEY, JSON.stringify(profiles));
  }, [profiles]);

  // Sync household data from Cloudflare Native or Supabase
  useEffect(() => {
    const syncData = async () => {
      try {
        let dbHouse: any = null;
        let dbProfiles: any[] = [];

        // 1. Try native apiClient
        try {
          const houses = await apiClient.households.getAll();
          if (houses && houses.length > 0) {
            dbHouse = (currentUser?.householdId && houses.find((h: any) => h.id === currentUser.householdId)) || houses[0];
            if (dbHouse?.id) {
              dbProfiles = await apiClient.profiles.getAll(dbHouse.id);
            }
          }
        } catch {
          // Native API not available, fall back to Supabase
        }

        // 2. Fall back to Supabase if not loaded
        if (!dbHouse && supabase) {
          const { data, error } = await supabase
            .from('households')
            .select('*')
            .limit(1)
            .maybeSingle();

          if (data && !error) {
            dbHouse = data;
            const { data: sProfs } = await supabase
              .from('profiles')
              .select('*')
              .eq('household_id', dbHouse.id);
            dbProfiles = sProfs || [];
          }
        }

        if (dbHouse) {
          setHousehold((prev) => ({
            ...prev,
            id: dbHouse.id,
            name: dbHouse.name || prev.name,
            currency: dbHouse.currency || prev.currency,
            inviteCode: dbHouse.invite_code || dbHouse.inviteCode || prev.inviteCode || 'MAPLE-2026',
            adminPaymentInfo: dbHouse.admin_payment_info || dbHouse.adminPaymentInfo || prev.adminPaymentInfo,
            webhookSettings: dbHouse.webhook_settings || dbHouse.webhookSettings || prev.webhookSettings,
          }));

          if (dbProfiles && dbProfiles.length > 0) {
            const mappedProfiles: Profile[] = dbProfiles
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
            if (realAdmin) {
              setSplitRules((prevRules) =>
                prevRules.map((r) => (r.profileId === 'user-admin' ? { ...r, profileId: realAdmin.id } : r))
              );
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

  // Remove mock system admin (will@example.com / user-admin) if a real admin exists
  useEffect(() => {
    const realAdmin = profiles.find(
      (p) => p.role === 'admin' && p.email !== 'will@example.com' && p.id !== 'user-admin'
    );
    if (realAdmin) {
      if (profiles.some((p) => p.email === 'will@example.com' || p.id === 'user-admin')) {
        setProfiles((prev) => prev.filter((p) => p.email !== 'will@example.com' && p.id !== 'user-admin'));
      }
      if (activeProfileId === 'user-admin') {
        setActiveProfileId(realAdmin.id);
      }
    }
  }, [profiles, activeProfileId]);

  const updateHousehold = (updated: Partial<Household>) => {
    setHousehold((prev) => {
      const merged = { ...prev, ...updated };
      if (isSupabaseConfigured() && supabase) {
        supabase
          .from('households')
          .update({
            name: merged.name,
            currency: merged.currency,
            invite_code: merged.inviteCode,
            admin_payment_info: merged.adminPaymentInfo,
            webhook_settings: merged.webhookSettings,
            updated_at: new Date().toISOString(),
          })
          .eq('id', merged.id)
          .then();
      }
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

    // Best-effort Supabase
    if (supabase) {
      supabase.from('profiles').insert({
        id: newId,
        household_id: household.id,
        full_name: newMember.fullName,
        email: newMember.email,
        role: newMember.role || 'member',
        avatar_url: newMember.avatarUrl,
        is_active: true,
      }).then();
    }

    // Add default split rules for this new roommate across all existing categories
    setSplitRules((prev) => {
      const newRules: CategorySplitRule[] = categories.map((cat) => ({
        id: `r-${cat.id}-${profile.id}-${Date.now()}`,
        categoryId: cat.id,
        profileId: profile.id,
        defaultPercentage: 0,
      }));
      return [...prev, ...newRules];
    });

    return profile;
  };

  const updateProfile = (id: string, updates: Partial<Profile>) => {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    apiClient.profiles.update(id, updates).catch(() => {});
  };

  const removeProfile = async (id: string) => {
    const nextProfiles = profiles.filter((p) => p.id !== id);
    setProfiles(nextProfiles);
    setSplitRules((prev) => prev.filter((r) => r.profileId !== id));
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

    // 1. Delete from Cloudflare Native D1 via API
    try {
      await apiClient.profiles.delete(id);
    } catch (err) {
      console.warn('apiClient delete error:', err);
    }

    // 2. Best-effort Supabase delete
    if (supabase) {
      try {
        await supabase.from('profiles').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase delete error:', err);
      }
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
