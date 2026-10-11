import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  Scale,
  Check,
  FileText,
  Upload,
  FileCheck,
  Loader2,
  Calendar,
  Building,
  Edit3,
} from 'lucide-react';
import { Bill, BillSplit, SplitStatus } from '../../types';
import { useHousehold } from '../../context/HouseholdContext';
import { apiClient } from '../../lib/apiClient';

interface EditBillSplitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill;
}

interface ShareRow {
  id?: string;
  profileId: string;
  percentage: number;
  amountDue: number;
  status: SplitStatus;
  notes?: string;
}

export const EditBillSplitsModal: React.FC<EditBillSplitsModalProps> = ({
  isOpen,
  onClose,
  bill,
}) => {
  const { profiles, updateBillSplits, updateBill } = useHousehold();

  // Basic Bill Details
  const [providerName, setProviderName] = useState<string>(bill.providerName);
  const [dueDate, setDueDate] = useState<string>(bill.dueDate);
  const [invoiceNumber, setInvoiceNumber] = useState<string>(bill.invoiceNumber || '');
  const [totalAmount, setTotalAmount] = useState<number>(bill.totalAmount);

  // File Management State
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newFileDataUrl, setNewFileDataUrl] = useState<string | null>(null);
  const [fileAction, setFileAction] = useState<'keep' | 'replace' | 'remove'>('keep');

  // Splits State
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize from the bill's existing data
  useEffect(() => {
    if (bill) {
      setProviderName(bill.providerName);
      setDueDate(bill.dueDate);
      setInvoiceNumber(bill.invoiceNumber || '');
      setTotalAmount(bill.totalAmount);
      setNewFile(null);
      setNewFileDataUrl(null);
      setFileAction('keep');
      setErrorMessage(null);

      const initialShares: ShareRow[] = bill.splits.map((s) => ({
        id: s.id,
        profileId: s.profileId,
        percentage: s.percentage,
        amountDue: s.amountDue,
        status: s.status,
        notes: s.notes,
      }));
      setShares(initialShares);
    }
  }, [bill]);

  if (!isOpen) return null;

  const currentExistingFileName =
    bill.fileName ||
    (bill.filePath && !bill.filePath.startsWith('data:')
      ? bill.filePath.split('/').pop()?.split('?')[0]
      : null);
  const hasExistingDocument = Boolean(bill.filePath || bill.fileDataUrl);

  // Active roommates in household that are not in current split
  const includedProfileIds = new Set(shares.map((s) => s.profileId));
  const excludedProfiles = profiles.filter((p) => !includedProfileIds.has(p.id));

  const sumPercentage = shares.reduce((acc, s) => acc + s.percentage, 0);
  const sumAmount = shares.reduce((acc, s) => acc + s.amountDue, 0);
  const isValidSplit = Math.abs(sumPercentage - 100) < 0.05;

  const handlePercentageChange = (profileId: string, newPct: number) => {
    setShares((prev) =>
      prev.map((s) => {
        if (s.profileId !== profileId) return s;
        const amt = Number(((newPct / 100) * totalAmount).toFixed(2));
        return { ...s, percentage: newPct, amountDue: amt };
      })
    );
  };

  const handleAmountChange = (profileId: string, newAmt: number) => {
    setShares((prev) =>
      prev.map((s) => {
        if (s.profileId !== profileId) return s;
        const pct = totalAmount > 0 ? Number(((newAmt / totalAmount) * 100).toFixed(1)) : 0;
        return { ...s, percentage: pct, amountDue: newAmt };
      })
    );
  };

  const handleRemoveRoommate = (profileId: string) => {
    if (shares.length <= 1) return; // Keep at least one roommate
    setShares((prev) => prev.filter((s) => s.profileId !== profileId));
  };

  const handleAddRoommate = (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;

    setShares((prev) => [
      ...prev,
      {
        id: `split-${Date.now()}-${profileId}`,
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
    const newShares = shares.map((s, idx) => {
      const pct = idx === 0 ? Number((basePct + remainder).toFixed(1)) : basePct;
      let amt = Number(((pct / 100) * totalAmount).toFixed(2));
      if (idx === count - 1) {
        amt = Number((totalAmount - accumulatedAmt).toFixed(2));
      } else {
        accumulatedAmt += amt;
      }
      return { ...s, percentage: pct, amountDue: amt };
    });

    setShares(newShares);
  };

  const handleAutoBalance = () => {
    if (shares.length === 0) return;
    const diff = Number((100 - sumPercentage).toFixed(1));
    setShares((prev) => {
      const updated = [...prev];
      updated[0] = {
        ...updated[0],
        percentage: Number((updated[0].percentage + diff).toFixed(1)),
        amountDue: Number((((updated[0].percentage + diff) / 100) * totalAmount).toFixed(2)),
      };
      return updated;
    });
  };

  const handleTotalAmountChange = (newTotal: number) => {
    setTotalAmount(newTotal);
    setShares((prev) =>
      prev.map((s) => ({
        ...s,
        amountDue: Number(((s.percentage / 100) * newTotal).toFixed(2)),
      }))
    );
  };

  const handleSelectNewFile = (selectedFile: File) => {
    setNewFile(selectedFile);
    setFileAction('replace');
    const reader = new FileReader();
    reader.onload = () => setNewFileDataUrl(reader.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleSave = async () => {
    if (!isValidSplit || totalAmount <= 0) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      // 1. Process document upload or removal without touching splits
      let updatedFilePath: string | undefined = undefined;
      let updatedFileType: string | undefined = undefined;
      let updatedFileName: string | undefined = undefined;
      let updatedFileDataUrl: string | undefined = undefined;

      if (fileAction === 'replace' && newFile) {
        const uploadRes = await apiClient.uploadFile(newFile);
        updatedFilePath = uploadRes.url;
        updatedFileType = uploadRes.fileType || newFile.type;
        updatedFileName = uploadRes.fileName || newFile.name;
        updatedFileDataUrl = newFileDataUrl || undefined;
      } else if (fileAction === 'remove') {
        updatedFilePath = '';
        updatedFileType = '';
        updatedFileName = '';
        updatedFileDataUrl = '';
      }

      // 2. Prepare splits (preserved exactly as configured)
      const updatedSplits: BillSplit[] = shares.map((s) => ({
        id: s.id || `split-${Date.now()}-${s.profileId}`,
        billId: bill.id,
        profileId: s.profileId,
        percentage: Number(s.percentage.toFixed(1)),
        amountDue: Number(s.amountDue.toFixed(2)),
        status: s.status,
        notes: s.notes,
      }));

      // 3. Update splits & total amount
      await updateBillSplits(bill.id, updatedSplits, totalAmount);

      // 4. Update bill details and file attachment
      const billUpdates: Partial<Bill> = {
        providerName: providerName.trim() || bill.providerName,
        dueDate,
        invoiceNumber: invoiceNumber.trim() || undefined,
        totalAmount,
      };

      if (updatedFilePath !== undefined) {
        billUpdates.filePath = updatedFilePath || undefined;
        billUpdates.fileType = updatedFileType || undefined;
        billUpdates.fileName = updatedFileName || undefined;
        billUpdates.fileDataUrl = updatedFileDataUrl || undefined;
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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Edit Bill & Splits</h3>
              <p className="text-xs text-zinc-400">
                {bill.providerName} • {bill.currency === 'EUR' ? '€' : '$'}{bill.totalAmount.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          
          {/* Bill Basic Info (Provider & Due Date) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase mb-1">
                Provider Name
              </label>
              <div className="relative">
                <Building className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder="Provider name"
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase mb-1">
                Payment Due Date
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Original Invoice Document Section */}
          <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-brand-400" />
                <span>Invoice Document File</span>
              </span>
              <span className="text-[10px] text-zinc-500">
                Upload without changing splits
              </span>
            </div>

            {/* Document States */}
            {fileAction === 'replace' && newFile ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-brand-500/10 border border-brand-500/30 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <FileCheck className="w-4 h-4 text-brand-400 shrink-0" />
                  <span className="font-semibold text-brand-300 truncate">{newFile.name}</span>
                  <span className="text-[10px] text-brand-400/80 shrink-0">({formatFileSize(newFile.size)})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewFile(null);
                    setNewFileDataUrl(null);
                    setFileAction('keep');
                  }}
                  className="text-xs text-zinc-400 hover:text-rose-400 font-semibold px-2 py-0.5 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : fileAction === 'remove' ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300">
                <span>Document will be removed when you save</span>
                <button
                  type="button"
                  onClick={() => setFileAction('keep')}
                  className="text-xs font-semibold underline hover:text-white"
                >
                  Undo
                </button>
              </div>
            ) : hasExistingDocument ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="font-medium text-zinc-200 truncate">
                    {currentExistingFileName || 'Attached Invoice Document'}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-brand-400 hover:underline text-xs font-semibold cursor-pointer">
                    <span>Replace Document</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => e.target.files?.[0] && handleSelectNewFile(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setFileAction('remove')}
                    className="p-1 rounded text-zinc-500 hover:text-rose-400 transition-colors"
                    title="Remove document attachment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-dashed border-zinc-700/80 text-xs">
                <span className="text-zinc-500 text-[11px]">
                  No document attached to this bill yet
                </span>
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 font-semibold cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Bill File (PDF / Image)</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => e.target.files?.[0] && handleSelectNewFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Bill Total Amount Adjustment */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase">
                Total Bill Amount
              </label>
              <span className="text-[11px] text-zinc-500">
                Updating amount scales split amounts proportionally
              </span>
            </div>
            <div className="relative w-full sm:w-44">
              <span className="text-zinc-500 font-bold text-sm absolute left-3 top-2">
                {bill.currency === 'EUR' ? '€' : '$'}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={totalAmount || ''}
                onChange={(e) => handleTotalAmountChange(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-8 pr-3 py-1.5 text-sm font-bold text-zinc-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Quick Split Controls */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <span className="text-xs font-semibold text-zinc-400 uppercase">
              Assigned Roommates ({shares.length})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSplitEvenly}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors"
              >
                <Scale className="w-3.5 h-3.5 text-brand-400" />
                <span>Split Evenly</span>
              </button>
              {!isValidSplit && (
                <button
                  type="button"
                  onClick={handleAutoBalance}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Auto-Balance</span>
                </button>
              )}
            </div>
          </div>

          {/* Splits List */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {shares.map((share) => {
              const profile = profiles.find((p) => p.id === share.profileId);
              const displayName = profile?.fullName || 'Roommate';

              return (
                <div
                  key={share.profileId}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={profile?.avatarUrl}
                      alt={displayName}
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                    <div className="truncate">
                      <span className="font-semibold text-zinc-200 block truncate">
                        {displayName} {profile?.role === 'admin' ? '(Admin)' : ''}
                      </span>
                      <span className="text-zinc-500 text-[10px]">
                        Status: {share.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Percentage Input */}
                    <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={share.percentage}
                        onChange={(e) => handlePercentageChange(share.profileId, Number(e.target.value))}
                        className="w-12 bg-transparent text-center font-bold text-zinc-100 focus:outline-none"
                      />
                      <span className="text-zinc-500 font-semibold">%</span>
                    </div>

                    {/* Amount Input */}
                    <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 w-24">
                      <span className="text-zinc-500 font-semibold">
                        {bill.currency === 'EUR' ? '€' : '$'}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={share.amountDue}
                        onChange={(e) => handleAmountChange(share.profileId, Number(e.target.value))}
                        className="w-full bg-transparent font-bold text-zinc-100 focus:outline-none text-right"
                      />
                    </div>

                    {/* Remove Roommate from Split */}
                    <button
                      type="button"
                      disabled={shares.length <= 1}
                      onClick={() => handleRemoveRoommate(share.profileId)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Exclude from this bill split"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Excluded Roommates Section */}
          {excludedProfiles.length > 0 && (
            <div className="pt-2 border-t border-zinc-800">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase block mb-1.5">
                Add Roommates to this Split
              </span>
              <div className="flex flex-wrap gap-2">
                {excludedProfiles.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddRoommate(p.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white text-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-brand-400" />
                    <span>{p.fullName || p.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Validation Status Footer */}
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-zinc-400 block">Total Allocated:</span>
              <span className="font-bold text-zinc-200">
                {bill.currency === 'EUR' ? '€' : '$'}{sumAmount.toFixed(2)} / {bill.currency === 'EUR' ? '€' : '$'}{totalAmount.toFixed(2)}
              </span>
            </div>
            <div className="text-right">
              <span className={`font-bold block ${isValidSplit ? 'text-emerald-400' : 'text-rose-400'}`}>
                Sum: {sumPercentage.toFixed(1)}% {isValidSplit ? '✓ Valid' : '✗ Must equal 100%'}
              </span>
              {!isValidSplit && (
                <span className="text-[11px] text-zinc-500">
                  Difference: {(100 - sumPercentage).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 sm:p-5 border-t border-zinc-800 flex items-center justify-end gap-3 bg-zinc-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isValidSplit || isSaving || totalAmount <= 0}
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-40 disabled:pointer-events-none text-black font-bold text-xs transition-colors shadow-glow"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
