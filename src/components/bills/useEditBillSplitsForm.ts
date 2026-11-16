import { useState, useEffect } from 'react';
import { Bill, BillSplit } from '../../types';
import { useHousehold } from '../../context/HouseholdContext';
import { apiClient } from '../../lib/apiClient';
import { getTodayIsoDate } from '../../lib/splitCalculator';
import { ShareRow } from './EditBillSplitsListSection';

export function useEditBillSplitsForm(bill: Bill, onClose: () => void) {
  const { profiles, updateBillSplits, updateBill } = useHousehold();

  const [providerName, setProviderName] = useState<string>(bill.providerName);
  const [dueDate, setDueDate] = useState<string>(bill.dueDate || getTodayIsoDate());
  const [invoiceNumber, setInvoiceNumber] = useState<string>(bill.invoiceNumber || '');
  const [totalAmount, setTotalAmount] = useState<number>(bill.totalAmount);

  const [newFile, setNewFile] = useState<File | null>(null);
  const [fileAction, setFileAction] = useState<'keep' | 'replace' | 'remove'>('keep');

  const [shares, setShares] = useState<ShareRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (bill) {
      setProviderName(bill.providerName || '');
      setDueDate(bill.dueDate || getTodayIsoDate());
      setInvoiceNumber(bill.invoiceNumber || '');
      setTotalAmount(Number(bill.totalAmount) || 0);
      setNewFile(null);
      setFileAction('keep');
      setErrorMessage(null);

      setShares(
        (bill.splits || []).map((s) => ({
          id: s.id,
          profileId: s.profileId,
          percentage: Number(s.percentage) || 0,
          amountDue: Number(s.amountDue) || 0,
          status: s.status,
          notes: s.notes,
        }))
      );
    }
  }, [bill]);

  const includedProfileIds = new Set(shares.map((s) => s.profileId));
  const excludedProfiles = profiles.filter((p) => !includedProfileIds.has(p.id));
  const sumPercentage = shares.reduce((acc, s) => acc + s.percentage, 0);
  const sumAmount = shares.reduce((acc, s) => acc + s.amountDue, 0);
  const isValidSplit = Math.abs(sumPercentage - 100) < 0.05;

  const handlePercentageChange = (profileId: string, newPct: number) => {
    const safePct = Number.isFinite(newPct) ? newPct : 0;
    setShares((prev) =>
      prev.map((s) => {
        if (s.profileId !== profileId) return s;
        const amt = Number(((safePct / 100) * totalAmount).toFixed(2));
        return { ...s, percentage: safePct, amountDue: amt };
      })
    );
  };

  const handleAmountChange = (profileId: string, newAmt: number) => {
    const safeAmt = Number.isFinite(newAmt) ? newAmt : 0;
    setShares((prev) =>
      prev.map((s) => {
        if (s.profileId !== profileId) return s;
        const pct = totalAmount > 0 ? Number(((safeAmt / totalAmount) * 100).toFixed(1)) : 0;
        return { ...s, percentage: pct, amountDue: safeAmt };
      })
    );
  };

  const handleRemoveRoommate = (profileId: string) => {
    if (shares.length <= 1) return;
    setShares((prev) => prev.filter((s) => s.profileId !== profileId));
  };

  const handleAddRoommate = (profileId: string) => {
    if (!profiles.find((p) => p.id === profileId)) return;
    setShares((prev) => [
      ...prev,
      {
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `split-${Date.now()}-${profileId}`,
        profileId,
        percentage: 0,
        amountDue: 0,
        status: 'pending',
      },
    ]);
  };

  const handleSplitEvenly = () => {
    if (shares.length === 0) return;
    const count = shares.length;
    const basePct = Math.floor((100 / count) * 10) / 10;
    const remainder = Number((100 - basePct * count).toFixed(1));

    let accumulatedAmt = 0;
    setShares(
      shares.map((s, idx) => {
        const pct = idx === 0 ? Number((basePct + remainder).toFixed(1)) : basePct;
        let amt = Number(((pct / 100) * totalAmount).toFixed(2));
        if (idx === count - 1) {
          amt = Number((totalAmount - accumulatedAmt).toFixed(2));
        } else {
          accumulatedAmt += amt;
        }
        return { ...s, percentage: pct, amountDue: amt };
      })
    );
  };

  const handleAutoBalance = () => {
    if (shares.length === 0) return;
    const diff = Number((100 - sumPercentage).toFixed(1));
    setShares((prev) => {
      const updated = [...prev];
      const nextPct = Number((updated[0].percentage + diff).toFixed(1));
      updated[0] = {
        ...updated[0],
        percentage: nextPct,
        amountDue: Number(((nextPct / 100) * totalAmount).toFixed(2)),
      };
      return updated;
    });
  };

  const handleTotalAmountChange = (newTotal: number) => {
    const safeTotal = Number.isFinite(newTotal) ? newTotal : 0;
    setTotalAmount(safeTotal);
    setShares((prev) =>
      prev.map((s) => ({
        ...s,
        amountDue: Number(((s.percentage / 100) * safeTotal).toFixed(2)),
      }))
    );
  };

  const handleSelectNewFile = (selectedFile: File) => {
    setNewFile(selectedFile);
    setFileAction('replace');
  };

  const handleSave = async () => {
    if (!isValidSplit || totalAmount <= 0 || !providerName.trim() || !dueDate) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      let updatedFilePath: string | undefined;
      let updatedFileType: string | undefined;
      let updatedFileName: string | undefined;

      if (fileAction === 'replace' && newFile) {
        const uploadRes = await apiClient.uploadFile(newFile);
        updatedFilePath = uploadRes.url;
        updatedFileType = uploadRes.fileType || newFile.type;
        updatedFileName = uploadRes.fileName || newFile.name;
      } else if (fileAction === 'remove') {
        updatedFilePath = '';
        updatedFileType = '';
        updatedFileName = '';
      }

      const updatedSplits: BillSplit[] = shares.map((s) => ({
        id:
          s.id ||
          (typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `split-${Date.now()}-${s.profileId}`),
        billId: bill.id,
        profileId: s.profileId,
        percentage: Number(s.percentage.toFixed(1)),
        amountDue: Number(s.amountDue.toFixed(2)),
        status: s.status,
        notes: s.notes,
      }));

      await updateBillSplits(bill.id, updatedSplits, totalAmount);

      const billUpdates: Partial<Bill> = {
        providerName: providerName.trim(),
        dueDate,
        invoiceNumber: invoiceNumber.trim() || undefined,
        totalAmount,
      };

      if (updatedFilePath !== undefined) {
        billUpdates.filePath = updatedFilePath || undefined;
        billUpdates.fileType = updatedFileType || undefined;
        billUpdates.fileName = updatedFileName || undefined;
        billUpdates.fileDataUrl = undefined;
      }

      await updateBill(bill.id, billUpdates);
      onClose();
    } catch (err: any) {
      console.error('Failed to update bill:', err);
      setErrorMessage(err.message || 'Error updating bill details.');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    profiles,
    providerName,
    setProviderName,
    dueDate,
    setDueDate,
    totalAmount,
    newFile,
    setNewFile,
    fileAction,
    setFileAction,
    shares,
    excludedProfiles,
    sumPercentage,
    sumAmount,
    isValidSplit,
    isSaving,
    errorMessage,
    handlePercentageChange,
    handleAmountChange,
    handleRemoveRoommate,
    handleAddRoommate,
    handleSplitEvenly,
    handleAutoBalance,
    handleTotalAmountChange,
    handleSelectNewFile,
    handleSave,
  };
}
