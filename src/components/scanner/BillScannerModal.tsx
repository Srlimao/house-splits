import React, { useState, useEffect } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { scanBillWithGemini } from '../../lib/gemini';
import { calculateExactSplit, formatCurrency } from '../../lib/splitCalculator';
import { BillCategoryCode, GeminiExtractionResult } from '../../types';
import {
  UploadCloud,
  Sparkles,
  X,
  Check,
  AlertCircle,
  Calendar,
  Building,
  Loader2,
  FileCheck,
  Edit3,
  Paperclip,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BillScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BillScannerModal: React.FC<BillScannerModalProps> = ({ isOpen, onClose }) => {
  const { household, profiles, categories, splitRules, addBill, activeProfile } = useHousehold();

  // Mode: AI Scanner vs Manual Entry
  const [entryMode, setEntryMode] = useState<'ai_scan' | 'manual'>('ai_scan');

  const [file, setFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [scanError, setScanError] = useState<string | null>(null);

  // Form State
  const [providerName, setProviderName] = useState('');
  const [categoryId, setCategoryId] = useState<string>(categories[1]?.id || categories[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [issueDate, setIssueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Per-roommate split shares (percentages)
  const [customShares, setCustomShares] = useState<{ profileId: string; percentage: number }[]>([]);

  // Initialize shares when category or profiles changes
  useEffect(() => {
    if (!categoryId || profiles.length === 0) return;

    const activeProfileIds = new Set(profiles.map((p) => p.id));
    const validCatRules = splitRules.filter(
      (r) => r.categoryId === categoryId && activeProfileIds.has(r.profileId)
    );

    // If valid rules exist for every active roommate in the household
    if (validCatRules.length === profiles.length) {
      setCustomShares(
        validCatRules.map((r) => ({ profileId: r.profileId, percentage: r.defaultPercentage }))
      );
    } else {
      // Default to equal split across all active roommates
      const basePct = Math.floor((100 / profiles.length) * 10) / 10;
      const remainder = Number((100 - basePct * profiles.length).toFixed(1));
      const shares = profiles.map((p, idx) => ({
        profileId: p.id,
        percentage: idx === 0 ? Number((basePct + remainder).toFixed(1)) : basePct,
      }));
      setCustomShares(shares);
    }
  }, [categoryId, splitRules, profiles]);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelectFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setScanError(null);
    setIsScanning(true);

    // Read Data URL for document download support
    const reader = new FileReader();
    reader.onload = () => setFileDataUrl(reader.result as string);
    reader.readAsDataURL(selectedFile);

    try {
      setScanStep('Sending to Google Gemini 2.5 Flash...');
      const result: GeminiExtractionResult = await scanBillWithGemini(selectedFile);

      setScanStep('Populating invoice details & split presets...');
      setProviderName(result.providerName);
      setTotalAmount(result.totalAmount);
      setDueDate(result.dueDate);
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

  const handleManualAttachment = (selectedFile: File) => {
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = () => setFileDataUrl(reader.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handlePercentageChange = (profileId: string, value: number) => {
    setCustomShares((prev) =>
      prev.map((s) => (s.profileId === profileId ? { ...s, percentage: Number(value) } : s))
    );
  };

  const adminProfile = profiles.find((p) => p.role === 'admin');
  const adminId = adminProfile?.id || 'user-admin';

  const calculatedShares = calculateExactSplit(totalAmount, customShares, adminId);
  const sumPercentage = customShares.reduce((acc, curr) => acc + curr.percentage, 0);
  const isValidSplit = Math.abs(sumPercentage - 100) < 0.05;

  const handleConfirm = async () => {
    if (!providerName || totalAmount <= 0) return;

    const splits = calculatedShares.map((cs) => ({
      id: `split-${Date.now()}-${cs.profileId}`,
      billId: '',
      profileId: cs.profileId,
      percentage: cs.percentage,
      amountDue: cs.amountDue,
      status: cs.profileId === adminId || cs.profileId === 'user-admin' ? ('confirmed_by_admin' as const) : ('pending' as const),
    }));

    await addBill({
      householdId: household.id,
      categoryId,
      providerName,
      invoiceNumber: invoiceNumber || undefined,
      totalAmount,
      currency: household.currency,
      dueDate,
      issueDate: issueDate || undefined,
      fileName: file ? file.name : undefined,
      fileDataUrl: fileDataUrl || undefined,
      paidToProvider: true,
      paidToProviderAt: new Date().toISOString(),
      createdBy: activeProfile.id,
      splits,
    });

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
    });

    onClose();
  };

  const showForm = entryMode === 'manual' || (entryMode === 'ai_scan' && file && !isScanning);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden my-8 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              {entryMode === 'ai_scan' ? <Sparkles className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
            </span>
            <div>
              <h3 className="text-lg font-bold text-white">
                {entryMode === 'ai_scan' ? 'Scan Bill with Gemini AI' : 'Manual Bill Entry'}
              </h3>
              <p className="text-xs text-zinc-400">Add a utility bill or rent payment to the house</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => setEntryMode('ai_scan')}
            className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              entryMode === 'ai_scan'
                ? 'bg-zinc-800 text-brand-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Bill Scan (PDF / Photo)</span>
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('manual')}
            className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              entryMode === 'manual'
                ? 'bg-zinc-800 text-brand-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Manual Entry (With or Without Doc)</span>
          </button>
        </div>

        {/* Upload Dropzone (AI Mode only when no file selected) */}
        {entryMode === 'ai_scan' && !file && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-zinc-700 hover:border-brand-500/60 rounded-2xl p-8 text-center bg-zinc-950/40 hover:bg-zinc-900/50 transition-all cursor-pointer relative"
          >
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => e.target.files?.[0] && handleSelectFile(e.target.files[0])}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-500/10 text-brand-400 flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-200">Drop bill or tap to upload photo / PDF</p>
                <p className="text-xs text-zinc-500 mt-1">Gemini AI extracts provider, amount, and due dates automatically</p>
              </div>
            </div>
          </div>
        )}

        {/* Scanning Indicator */}
        {isScanning && (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin mb-3" />
            <p className="text-sm font-semibold text-zinc-200">{scanStep}</p>
            <p className="text-xs text-zinc-500 mt-1">Extracting amounts, dates, and category...</p>
          </div>
        )}

        {/* Scan Error Alert */}
        {scanError && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{scanError}</span>
          </div>
        )}

        {/* Review & Edit Form */}
        {showForm && (
          <div className="space-y-4">
            {/* Optional Attachment Card */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs">
              <div className="flex items-center gap-2 truncate">
                {file ? (
                  <>
                    <FileCheck className="w-4 h-4 text-brand-400 shrink-0" />
                    <span className="font-medium text-zinc-300 truncate">{file.name}</span>
                  </>
                ) : (
                  <>
                    <Paperclip className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span className="text-zinc-400">No document attached (optional)</span>
                  </>
                )}
              </div>

              <label className="text-brand-400 hover:underline text-xs font-semibold cursor-pointer">
                <span>{file ? 'Replace File' : 'Attach Document'}</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => e.target.files?.[0] && handleManualAttachment(e.target.files[0])}
                  className="hidden"
                />
              </label>
            </div>

            {/* Provider & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                  Provider Name
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    placeholder="e.g. City Water, EDP, Landlord"
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-brand-500 cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amount & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                  Total Amount ({household.currency})
                </label>
                <div className="relative">
                  <span className="text-zinc-500 font-bold text-sm absolute left-3 top-2">
                    {household.currency === 'EUR' ? '€' : '$'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={totalAmount || ''}
                    onChange={(e) => setTotalAmount(Number(e.target.value))}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-sm font-bold text-zinc-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                  Payment Due Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Live Roommate Split Breakdown */}
            <div className="pt-2 border-t border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-400 uppercase">
                  Roommate Split Allocation
                </span>
                <span className={`text-xs font-bold ${isValidSplit ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Sum: {sumPercentage.toFixed(1)}% {isValidSplit ? '(Valid)' : '(Must equal 100%)'}
                </span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {calculatedShares
                  .filter((share) => profiles.some((p) => p.id === share.profileId))
                  .map((share) => {
                    const profile = profiles.find((p) => p.id === share.profileId);
                    if (!profile) return null;
                    const displayName = profile.fullName || profile.email?.split('@')[0] || 'Roommate';
                    const initial = displayName.charAt(0).toUpperCase();

                    return (
                      <div
                        key={share.profileId}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          {profile.avatarUrl ? (
                            <img
                              src={profile.avatarUrl}
                              alt={displayName}
                              className="w-6 h-6 rounded-full object-cover shrink-0"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                                const next = (e.currentTarget as HTMLElement).nextElementSibling;
                                if (next) (next as HTMLElement).classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 font-bold text-[10px] items-center justify-center shrink-0 ${
                              profile.avatarUrl ? 'hidden' : 'flex'
                            }`}
                          >
                            {initial}
                          </div>
                          <span className="font-medium text-zinc-200">
                            {displayName} {profile.role === 'admin' ? '(Admin)' : ''}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              value={share.percentage}
                              onChange={(e) => handlePercentageChange(share.profileId, Number(e.target.value))}
                              className="w-14 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-center text-xs font-bold text-zinc-100 focus:outline-none focus:border-brand-500"
                            />
                            <span className="text-zinc-500">%</span>
                          </div>

                          <span className="font-bold text-brand-400 text-sm w-16 text-right">
                            {formatCurrency(share.amountDue, household.currency)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!isValidSplit || totalAmount <= 0 || !providerName.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-xs shadow-glow transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Save Bill & Generate Splits</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
