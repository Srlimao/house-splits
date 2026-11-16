import React from 'react';
import {
  Household,
  Profile,
  BillCategory,
  Bill,
  BillSplit,
  SplitStatus,
} from '../types';
import { notifyNewBill, notifyPaymentMade } from '../lib/webhooks';
import { apiClient } from '../lib/apiClient';
import { normalizeBill } from './householdStorageAndNormalizers';
import { AuthUser } from './useAuthSessionState';

interface UseBillMutationsParams {
  household: Household;
  profiles: Profile[];
  categories: BillCategory[];
  bills: Bill[];
  setBills: React.Dispatch<React.SetStateAction<Bill[]>>;
  activeProfile: Profile;
  currentUser: AuthUser | null;
}

export function useBillMutations({
  household,
  profiles,
  categories,
  bills,
  setBills,
  activeProfile,
  currentUser,
}: UseBillMutationsParams) {
  const addBill = async (billData: Omit<Bill, 'id' | 'createdAt'>): Promise<Bill> => {
    const newId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `bill-${Date.now()}`;
    const realAdmin = profiles.find((p) => p.role === 'admin');
    const realHouseholdId =
      household.id && household.id !== 'house-1'
        ? household.id
        : currentUser?.householdId || household.id;
    const realCreatorId =
      activeProfile.id !== 'user-admin'
        ? activeProfile.id
        : realAdmin?.id || activeProfile.id;

    let resolvedCategoryId = billData.categoryId;
    const catMatch = categories.find(
      (c) =>
        c.id === billData.categoryId ||
        c.code === billData.categoryId ||
        c.code === billData.categoryId.replace(/^cat-/, '') ||
        (c.code === 'electricity' && billData.categoryId === 'cat-elec') ||
        (c.code === 'internet' && billData.categoryId === 'cat-net')
    );
    if (catMatch) resolvedCategoryId = catMatch.id;

    const newBill = normalizeBill({
      ...billData,
      id: newId,
      householdId: realHouseholdId,
      categoryId: resolvedCategoryId,
      createdBy: realCreatorId,
      splits: (billData.splits || []).map((s) => ({
        ...s,
        billId: newId,
        profileId: s.profileId === 'user-admin' && realAdmin ? realAdmin.id : s.profileId,
      })),
      createdAt: new Date().toISOString(),
    });

    setBills((prev) => [newBill, ...prev]);

    try {
      const persisted = await apiClient.bills.create(newBill);
      if (persisted?.id) {
        setBills((prev) =>
          prev.map((b) => (b.id === newId ? normalizeBill({ ...b, ...persisted }) : b))
        );
      }
    } catch (err) {
      console.warn('Could not persist bill to D1:', err);
    }

    const cat = categories.find((c) => c.id === newBill.categoryId);
    notifyNewBill(household, newBill, cat?.name || 'Utility', profiles).catch(() => {});
    return newBill;
  };

  const removeBill = (billId: string) => {
    setBills((prev) => prev.filter((b) => b.id !== billId));
    apiClient.bills.delete(billId).catch((err) => console.warn('Could not delete bill from D1:', err));
  };

  const togglePaidToProvider = (billId: string) => {
    const existing = bills.find((b) => b.id === billId);
    const nextPaid = existing ? !existing.paidToProvider : true;
    const nextPaidAt = nextPaid ? new Date().toISOString() : undefined;

    setBills((prev) =>
      prev.map((b) =>
        b.id === billId ? { ...b, paidToProvider: nextPaid, paidToProviderAt: nextPaidAt } : b
      )
    );

    apiClient.bills
      .update(billId, { paidToProvider: nextPaid, paidToProviderAt: nextPaidAt })
      .catch((err) => console.warn('Could not update bill in D1:', err));
  };

  const setSplitStatus = async (
    billId: string,
    profileId: string,
    status: SplitStatus,
    options?: { notes?: string; paidAt?: string; confirmedAt?: string }
  ) => {
    const nowIso = new Date().toISOString();
    setBills((prev) =>
      prev.map((b) => {
        if (b.id !== billId) return b;
        const splits = (b.splits || []).map((s) => {
          if (s.profileId !== profileId) return s;
          return {
            ...s,
            status,
            markedPaidAt:
              status === 'pending'
                ? undefined
                : status === 'confirmed_by_admin'
                ? s.markedPaidAt || options?.paidAt || nowIso
                : options?.paidAt || nowIso,
            confirmedPaidAt: status === 'confirmed_by_admin' ? options?.confirmedAt || nowIso : undefined,
            notes: options?.notes !== undefined ? options?.notes : s.notes,
          };
        });
        return { ...b, splits };
      })
    );

    try {
      await apiClient.bills.update(billId, {
        splitUpdate: {
          profileId,
          status,
          markedPaidAt: status === 'pending' ? null : options?.paidAt || nowIso,
          confirmedPaidAt: status === 'confirmed_by_admin' ? options?.confirmedAt || nowIso : null,
          notes: options?.notes,
          resetTimestamps: status === 'pending',
        },
      });
    } catch (err) {
      console.warn('Could not update split in D1:', err);
    }

    if (status === 'paid_to_admin') {
      const payer = profiles.find((p) => p.id === profileId);
      const targetBill = bills.find((b) => b.id === billId);
      const splitAmount = targetBill?.splits?.find((s) => s.profileId === profileId)?.amountDue || 0;
      if (payer) {
        notifyPaymentMade(household, payer.fullName, splitAmount, household.currency).catch(() => {});
      }
    }
  };

  const markSplitPaidToAdmin = (billId: string, profileId: string, notes?: string) => {
    setSplitStatus(billId, profileId, 'paid_to_admin', { notes });
  };

  const confirmSplitPayment = (billId: string, profileId: string) => {
    setSplitStatus(billId, profileId, 'confirmed_by_admin');
  };

  const revertSplitToPending = async (billId: string, profileId: string) => {
    await setSplitStatus(billId, profileId, 'pending');
  };

  const confirmAllPendingSplits = async (): Promise<number> => {
    const pendingItems: { billId: string; profileId: string }[] = [];
    bills.forEach((b) => {
      (b.splits || []).forEach((s) => {
        if (s.status === 'paid_to_admin') pendingItems.push({ billId: b.id, profileId: s.profileId });
      });
    });
    for (const item of pendingItems) {
      await setSplitStatus(item.billId, item.profileId, 'confirmed_by_admin');
    }
    return pendingItems.length;
  };

  const updateBillSplits = async (billId: string, updatedSplits: BillSplit[], newTotalAmount?: number) => {
    const realAdmin = profiles.find((p) => p.role === 'admin');
    const mappedSplits = updatedSplits.map((s) => ({
      ...s,
      profileId: s.profileId === 'user-admin' && realAdmin ? realAdmin.id : s.profileId,
    }));

    setBills((prev) =>
      prev.map((b) =>
        b.id === billId
          ? { ...b, totalAmount: newTotalAmount !== undefined ? newTotalAmount : b.totalAmount, splits: mappedSplits }
          : b
      )
    );

    try {
      await apiClient.bills.update(billId, { splits: mappedSplits, totalAmount: newTotalAmount });
    } catch (err) {
      console.warn('Could not update bill splits in D1:', err);
    }
  };

  const updateBill = async (billId: string, updates: Partial<Bill>): Promise<void> => {
    setBills((prev) =>
      prev.map((b) => (b.id === billId ? normalizeBill({ ...b, ...updates }) : b))
    );
    try {
      await apiClient.bills.update(billId, updates);
    } catch (err) {
      console.warn('Could not update bill in D1:', err);
    }
  };

  return {
    addBill,
    removeBill,
    togglePaidToProvider,
    setSplitStatus,
    markSplitPaidToAdmin,
    confirmSplitPayment,
    revertSplitToPending,
    confirmAllPendingSplits,
    updateBillSplits,
    updateBill,
  };
}
