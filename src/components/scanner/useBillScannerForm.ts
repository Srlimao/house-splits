import React, { useState, useEffect } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { scanBillWithGemini } from '../../lib/gemini';
import { calculateExactSplit, getTodayIsoDate } from '../../lib/splitCalculator';
import { GeminiExtractionResult } from '../../types';
import { apiClient } from '../../lib/apiClient';
import confetti from 'canvas-confetti';

export function useBillScannerForm(onClose: () => void) {
  const { household, profiles, categories, splitRules, addBill, activeProfile } = useHousehold();

  const [entryMode, setEntryMode] = useState<'ai_scan' | 'manual'>('ai_scan');
  const [file, setFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [scanError, setScanError] = useState<string | null>(null);

  const [providerName, setProviderName] = useState('');
  const [categoryId, setCategoryId] = useState<string>(categories[1]?.id || categories[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>(getTodayIsoDate());
  const [issueDate, setIssueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [customShares, setCustomShares] = useState<{ profileId: string; percentage: number }[]>([]);

  useEffect(() => {
    if (categories.length > 0 && !categories.some((c) => c.id === categoryId)) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  useEffect(() => {
    if (!categoryId || profiles.length === 0) return;

    const activeProfileIds = new Set(profiles.map((p) => p.id));
    const validCatRules = splitRules.filter(
      (r) => r.categoryId === categoryId && activeProfileIds.has(r.profileId)
    );

    if (validCatRules.length === profiles.length) {
      setCustomShares(
        validCatRules.map((r) => ({ profileId: r.profileId, percentage: r.defaultPercentage }))
      );
    } else {
      const basePct = Math.floor((100 / profiles.length) * 10) / 10;
      const remainder = Number((100 - basePct * profiles.length).toFixed(1));
      setCustomShares(
        profiles.map((p, idx) => ({
          profileId: p.id,
          percentage: idx === 0 ? Number((basePct + remainder).toFixed(1)) : basePct,
        }))
      );
    }
  }, [categoryId, splitRules, profiles]);

  const resetFormState = () => {
    setFile(null);
    setFileDataUrl(null);
    setIsScanning(false);
    setIsSaving(false);
    setScanStep('');
    setScanError(null);
    setProviderName('');
    setCategoryId(categories[1]?.id || categories[0]?.id || '');
    setInvoiceNumber('');
    setTotalAmount(0);
    setDueDate(getTodayIsoDate());
    setIssueDate('');
    setNotes('');
  };

  const handleClose = () => {
    resetFormState();
    onClose();
  };

  const handleSelectFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setScanError(null);
    setIsScanning(true);

    const reader = new FileReader();
    reader.onload = () => setFileDataUrl(reader.result as string);
    reader.readAsDataURL(selectedFile);

    try {
      setScanStep('Sending to Google Gemini 2.5 Flash...');
      const result: GeminiExtractionResult = await scanBillWithGemini(selectedFile);

      setScanStep('Populating invoice details & split presets...');
      setProviderName(result.providerName || '');
      setTotalAmount(Number(result.totalAmount) || 0);
      setDueDate(result.dueDate || getTodayIsoDate());
      if (result.issueDate) setIssueDate(result.issueDate);
      if (result.invoiceNumber) setInvoiceNumber(result.invoiceNumber);
      if (result.notes) setNotes(result.notes);

      const matchedCat = categories.find((c) => c.code === result.categorySuggestion) || categories[0];
      if (matchedCat) {
        setCategoryId(matchedCat.id);
      }
    } catch (err: any) {
      setScanError(err.message || 'Error parsing bill with Gemini.');
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleManualAttachment = (selectedFile: File) => {
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = () => setFileDataUrl(reader.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handlePercentageChange = (profileId: string, value: number) => {
    const safeVal = Number.isFinite(value) ? value : 0;
    setCustomShares((prev) =>
      prev.map((s) => (s.profileId === profileId ? { ...s, percentage: safeVal } : s))
    );
  };

  const handleRemoveRoommate = (profileId: string) => {
    if (customShares.length <= 1) return;
    setCustomShares((prev) => prev.filter((s) => s.profileId !== profileId));
  };

  const handleAddRoommate = (profileId: string) => {
    if (customShares.some((s) => s.profileId === profileId)) return;
    setCustomShares((prev) => [...prev, { profileId, percentage: 0 }]);
  };

  const handleSplitEvenly = () => {
    if (customShares.length === 0) return;
    const count = customShares.length;
    const basePct = Math.floor((100 / count) * 10) / 10;
    const remainder = Number((100 - basePct * count).toFixed(1));
    setCustomShares(
      customShares.map((s, idx) => ({
        profileId: s.profileId,
        percentage: idx === 0 ? Number((basePct + remainder).toFixed(1)) : basePct,
      }))
    );
  };

  const sumPercentage = customShares.reduce((acc, curr) => acc + curr.percentage, 0);
  const isValidSplit = Math.abs(sumPercentage - 100) < 0.05;

  const handleAutoBalance = () => {
    if (customShares.length === 0) return;
    const diff = Number((100 - sumPercentage).toFixed(1));
    setCustomShares((prev) => {
      const updated = [...prev];
      updated[0] = {
        ...updated[0],
        percentage: Number((updated[0].percentage + diff).toFixed(1)),
      };
      return updated;
    });
  };

  const adminProfile = profiles.find((p) => p.role === 'admin');
  const adminId = adminProfile?.id || 'user-admin';
  const calculatedShares = calculateExactSplit(totalAmount, customShares, adminId);
  const includedProfileIds = new Set(customShares.map((s) => s.profileId));
  const excludedProfiles = profiles.filter((p) => !includedProfileIds.has(p.id));

  const handleConfirm = async () => {
    if (!providerName.trim() || totalAmount <= 0 || !dueDate || !isValidSplit || isSaving) return;

    setIsSaving(true);
    setScanError(null);

    try {
      let uploadedFilePath: string | undefined;
      let uploadedFileType: string | undefined = file?.type;
      let uploadedFileName: string | undefined = file?.name;

      if (file) {
        try {
          const uploadResult = await apiClient.uploadFile(file);
          uploadedFilePath = uploadResult.url;
          uploadedFileType = uploadResult.fileType || file.type;
          uploadedFileName = uploadResult.fileName || file.name;
        } catch (uploadErr) {
          console.warn('Failed to upload file to storage, checking safe data URL fallback:', uploadErr);
          if (fileDataUrl && fileDataUrl.length <= 900_000) {
            uploadedFilePath = fileDataUrl;
          }
        }
      }

      const splits = calculatedShares.map((cs) => ({
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `split-${Date.now()}-${cs.profileId}`,
        billId: '',
        profileId: cs.profileId,
        percentage: cs.percentage,
        amountDue: cs.amountDue,
        status:
          cs.profileId === adminId || cs.profileId === 'user-admin'
            ? ('confirmed_by_admin' as const)
            : ('pending' as const),
      }));

      await addBill({
        householdId: household.id,
        categoryId,
        providerName: providerName.trim(),
        invoiceNumber: invoiceNumber || undefined,
        totalAmount,
        currency: household.currency,
        dueDate,
        issueDate: issueDate || undefined,
        filePath: uploadedFilePath,
        fileType: uploadedFileType,
        fileName: uploadedFileName,
        fileDataUrl: undefined,
        paidToProvider: true,
        paidToProviderAt: new Date().toISOString(),
        createdBy: activeProfile.id,
        splits,
      });

      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } catch {
        // ignore animation error
      }

      resetFormState();
      onClose();
    } catch (err: any) {
      setScanError(err.message || 'Error saving bill');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    household,
    profiles,
    categories,
    entryMode,
    setEntryMode,
    file,
    isScanning,
    isSaving,
    scanStep,
    scanError,
    providerName,
    setProviderName,
    categoryId,
    setCategoryId,
    totalAmount,
    setTotalAmount,
    dueDate,
    setDueDate,
    notes,
    customShares,
    sumPercentage,
    isValidSplit,
    calculatedShares,
    excludedProfiles,
    handleClose,
    handleFileDrop,
    handleSelectFile,
    handleManualAttachment,
    handlePercentageChange,
    handleRemoveRoommate,
    handleAddRoommate,
    handleSplitEvenly,
    handleAutoBalance,
    handleConfirm,
  };
}
