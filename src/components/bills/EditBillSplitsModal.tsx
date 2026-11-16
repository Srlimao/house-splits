import React from 'react';
import { X, AlertCircle, Check, Loader2, Calendar, Building, Edit3 } from 'lucide-react';
import { Bill } from '../../types';
import { getCurrencySymbol } from '../../lib/splitCalculator';
import { EditBillDocumentSection } from './EditBillDocumentSection';
import { EditBillSplitsListSection } from './EditBillSplitsListSection';
import { useEditBillSplitsForm } from './useEditBillSplitsForm';

interface EditBillSplitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill;
}

export const EditBillSplitsModal: React.FC<EditBillSplitsModalProps> = ({
  isOpen,
  onClose,
  bill,
}) => {
  const form = useEditBillSplitsForm(bill, onClose);

  if (!isOpen) return null;

  const currencySymbol = getCurrencySymbol(bill.currency);
  const currentExistingFileName =
    bill.fileName ||
    (bill.filePath && !bill.filePath.startsWith('data:')
      ? bill.filePath.split('/').pop()?.split('?')[0] || null
      : null);
  const hasExistingDocument = Boolean(bill.filePath || bill.fileDataUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden my-8">
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Edit Bill &amp; Splits</h3>
              <p className="text-xs text-zinc-400">
                {bill.providerName} • {currencySymbol}
                {(Number(bill.totalAmount) || 0).toFixed(2)}
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

        <div className="p-4 sm:p-5 space-y-4">
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
                  value={form.providerName}
                  onChange={(e) => form.setProviderName(e.target.value)}
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
                  value={form.dueDate}
                  onChange={(e) => form.setDueDate(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          <EditBillDocumentSection
            fileAction={form.fileAction}
            newFile={form.newFile}
            hasExistingDocument={hasExistingDocument}
            currentExistingFileName={currentExistingFileName}
            onSelectNewFile={form.handleSelectNewFile}
            onCancelReplace={() => {
              form.setNewFile(null);
              form.setFileAction('keep');
            }}
            onSetFileAction={form.setFileAction}
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase">Total Bill Amount</label>
              <span className="text-[11px] text-zinc-500">
                Updating amount scales split amounts proportionally
              </span>
            </div>
            <div className="relative w-full sm:w-44">
              <span className="text-zinc-500 font-bold text-sm absolute left-3 top-2">{currencySymbol}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.totalAmount || ''}
                onChange={(e) => form.handleTotalAmountChange(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-8 pr-3 py-1.5 text-sm font-bold text-zinc-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <EditBillSplitsListSection
            shares={form.shares}
            profiles={form.profiles}
            excludedProfiles={form.excludedProfiles}
            currency={bill.currency}
            totalAmount={form.totalAmount}
            sumPercentage={form.sumPercentage}
            sumAmount={form.sumAmount}
            isValidSplit={form.isValidSplit}
            onSplitEvenly={form.handleSplitEvenly}
            onAutoBalance={form.handleAutoBalance}
            onPercentageChange={form.handlePercentageChange}
            onAmountChange={form.handleAmountChange}
            onRemoveRoommate={form.handleRemoveRoommate}
            onAddRoommate={form.handleAddRoommate}
          />

          {form.errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{form.errorMessage}</span>
            </div>
          )}
        </div>

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
            disabled={
              !form.isValidSplit ||
              form.isSaving ||
              form.totalAmount <= 0 ||
              !form.providerName.trim() ||
              !form.dueDate
            }
            onClick={form.handleSave}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-40 disabled:pointer-events-none text-black font-bold text-xs transition-colors shadow-glow"
          >
            {form.isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{form.isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
