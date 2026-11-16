import React, { useEffect } from 'react';
import {
  Household,
  Profile,
  BillCategory,
  CategorySplitRule,
  Bill,
  UserRole,
} from '../types';
import { apiClient } from '../lib/apiClient';
import {
  DEFAULT_AVATAR_URL,
  normalizeHousehold,
  normalizeBillsList,
  reconcileSplitRules,
} from './householdStorageAndNormalizers';
import { AuthUser } from './useAuthSessionState';

interface UseHouseholdSyncParams {
  currentUser: AuthUser | null;
  inspectingHouseholdId: string | null;
  categories: BillCategory[];
  setHousehold: React.Dispatch<React.SetStateAction<Household>>;
  setProfiles: React.Dispatch<React.SetStateAction<Profile[]>>;
  setCategories: React.Dispatch<React.SetStateAction<BillCategory[]>>;
  setSplitRules: React.Dispatch<React.SetStateAction<CategorySplitRule[]>>;
  setBills: React.Dispatch<React.SetStateAction<Bill[]>>;
}

export function useHouseholdSync({
  currentUser,
  inspectingHouseholdId,
  categories,
  setHousehold,
  setProfiles,
  setCategories,
  setSplitRules,
  setBills,
}: UseHouseholdSyncParams) {
  useEffect(() => {
    let cancelled = false;

    const syncData = async () => {
      try {
        const houses = await apiClient.households.getAll();
        if (cancelled || !houses || houses.length === 0) return;

        const targetHouseId = inspectingHouseholdId || currentUser?.householdId;
        const dbHouse =
          (targetHouseId && houses.find((h: any) => h.id === targetHouseId)) || houses[0];
        if (!dbHouse?.id) return;

        const [dbProfiles, dbCategories, dbBills] = await Promise.all([
          apiClient.profiles.getAll(dbHouse.id),
          apiClient.categories.getAll(dbHouse.id).catch(() => []),
          apiClient.bills.getAll(dbHouse.id),
        ]);
        if (cancelled) return;

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

        const mappedProfiles: Profile[] = (dbProfiles || [])
          .filter((dbP) => {
            const role = dbP.role as UserRole;
            const isSys = Boolean(
              dbP.is_system_manager ?? dbP.isSystemManager ?? role === 'system_manager'
            );
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
            avatarUrl: dbP.avatar_url || dbP.avatarUrl || DEFAULT_AVATAR_URL,
            isActive: dbP.is_active ?? dbP.isActive ?? true,
          }));

        setHousehold((prev) => normalizeHousehold(dbHouse, prev));
        setProfiles(mappedProfiles);

        const realAdmin = mappedProfiles.find((p) => p.role === 'admin');
        setSplitRules((prevRules) => {
          const mapped = prevRules.map((r) =>
            r.profileId === 'user-admin' && realAdmin ? { ...r, profileId: realAdmin.id } : r
          );
          return reconcileSplitRules(mapped, mappedProfiles, activeCategories);
        });

        if (dbBills) {
          const normalized = normalizeBillsList(dbBills).map((b) =>
            realAdmin
              ? {
                  ...b,
                  createdBy: b.createdBy === 'user-admin' ? realAdmin.id : b.createdBy,
                  splits: (b.splits || []).map((s) =>
                    s.profileId === 'user-admin' ? { ...s, profileId: realAdmin.id } : s
                  ),
                }
              : b
          );
          setBills(normalized);
        }
      } catch (e) {
        console.error('Error fetching household data:', e);
      }
    };

    syncData();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.householdId, currentUser?.id, currentUser?.email, inspectingHouseholdId]);
}
