import React from 'react';
import { BillScannerForm } from './BillScannerForm';
import { useBillScannerForm } from './useBillScannerForm';
import {
  UploadCloud,
  Sparkles,
  X,
  AlertCircle,
  Loader2,
  Edit3,
} from 'lucide-react';

interface BillScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BillScannerModal: React.FC<BillScannerModalProps> = ({ isOpen, onClose }) => {
  const form = useBillScannerForm(onClose);

  if (!isOpen) return null;

  const showForm =
    form.entryMode === 'manual' || (form.entryMode === 'ai_scan' && form.file && !form.isScanning);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden my-8 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              {form.entryMode === 'ai_scan' ? <Sparkles className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
            </span>
            <div>
              <h3 className="text-lg font-bold text-white">
                {form.entryMode === 'ai_scan' ? 'Scan Bill with Gemini AI' : 'Manual Bill Entry'}
              </h3>
              <p className="text-xs text-zinc-400">Add a utility bill or rent payment to the house</p>
            </div>
          </div>
          <button onClick={form.handleClose} className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => form.setEntryMode('ai_scan')}
            className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              form.entryMode === 'ai_scan' ? 'bg-zinc-800 text-brand-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Bill Scan (PDF / Photo)</span>
          </button>
          <button
            type="button"
            onClick={() => form.setEntryMode('manual')}
            className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              form.entryMode === 'manual' ? 'bg-zinc-800 text-brand-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Manual Entry (With or Without Doc)</span>
          </button>
        </div>

        {form.entryMode === 'ai_scan' && !form.file && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={form.handleFileDrop}
            className="border-2 border-dashed border-zinc-700 hover:border-brand-500/60 rounded-2xl p-8 text-center bg-zinc-950/40 hover:bg-zinc-900/50 transition-all cursor-pointer relative"
          >
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => e.target.files?.[0] && form.handleSelectFile(e.target.files[0])}
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

        {form.isScanning && (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin mb-3" />
            <p className="text-sm font-semibold text-zinc-200">{form.scanStep}</p>
            <p className="text-xs text-zinc-500 mt-1">Extracting amounts, dates, and category...</p>
          </div>
        )}

        {form.scanError && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{form.scanError}</span>
          </div>
        )}

        {showForm && (
          <BillScannerForm
            file={form.file}
            providerName={form.providerName}
            categoryId={form.categoryId}
            categories={form.categories}
            totalAmount={form.totalAmount}
            currency={form.household.currency}
            dueDate={form.dueDate}
            isSaving={form.isSaving}
            isValidSplit={form.isValidSplit}
            sumPercentage={form.sumPercentage}
            calculatedShares={form.calculatedShares}
            profiles={form.profiles}
            customSharesCount={form.customShares.length}
            excludedProfiles={form.excludedProfiles}
            onManualAttachment={form.handleManualAttachment}
            onProviderNameChange={form.setProviderName}
            onCategoryIdChange={form.setCategoryId}
            onTotalAmountChange={form.setTotalAmount}
            onDueDateChange={form.setDueDate}
            onSplitEvenly={form.handleSplitEvenly}
            onAutoBalance={form.handleAutoBalance}
            onPercentageChange={form.handlePercentageChange}
            onRemoveRoommate={form.handleRemoveRoommate}
            onAddRoommate={form.handleAddRoommate}
            onClose={form.handleClose}
            onConfirm={form.handleConfirm}
          />
        )}
      </div>
    </div>
  );
};
