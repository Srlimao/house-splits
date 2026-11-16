import React from 'react';
import { BillCategory, Profile } from '../../types';
import { CalculatedShare, getCurrencySymbol } from '../../lib/splitCalculator';
import { BillSplitAllocationSection } from './BillSplitAllocationSection';
import {
  FileCheck,
  Paperclip,
  Building,
  Calendar,
  Loader2,
  Check,
} from 'lucide-react';

interface BillScannerFormProps {
  file: File | null;
  providerName: string;
  categoryId: string;
  categories: BillCategory[];
  totalAmount: number;
  currency: string;
  dueDate: string;
  isSaving: boolean;
  isValidSplit: boolean;
  sumPercentage: number;
  calculatedShares: CalculatedShare[];
  profiles: Profile[];
  customSharesCount: number;
  excludedProfiles: Profile[];
  onManualAttachment: (file: File) => void;
  onProviderNameChange: (val: string) => void;
  onCategoryIdChange: (val: string) => void;
  onTotalAmountChange: (val: number) => void;
  onDueDateChange: (val: string) => void;
  onSplitEvenly: () => void;
  onAutoBalance: () => void;
  onPercentageChange: (profileId: string, value: number) => void;
  onRemoveRoommate: (profileId: string) => void;
  onAddRoommate: (profileId: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const BillScannerForm: React.FC<BillScannerFormProps> = ({
  file,
  providerName,
  categoryId,
  categories,
  totalAmount,
  currency,
  dueDate,
  isSaving,
  isValidSplit,
  sumPercentage,
  calculatedShares,
  profiles,
  customSharesCount,
  excludedProfiles,
  onManualAttachment,
  onProviderNameChange,
  onCategoryIdChange,
  onTotalAmountChange,
  onDueDateChange,
  onSplitEvenly,
  onAutoBalance,
  onPercentageChange,
  onRemoveRoommate,
  onAddRoommate,
  onClose,
  onConfirm,
}) => {
  return (
    <div className="space-y-4">
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
            onChange={(e) => e.target.files?.[0] && onManualAttachment(e.target.files[0])}
            className="hidden"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Provider Name</label>
          <div className="relative">
            <Building className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              required
              value={providerName}
              onChange={(e) => onProviderNameChange(e.target.value)}
              placeholder="e.g. City Water, EDP, Landlord"
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Category</label>
          <select
            value={categoryId}
            onChange={(e) => onCategoryIdChange(e.target.value)}
            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-brand-500 cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
            Total Amount ({currency})
          </label>
          <div className="relative">
            <span className="text-zinc-500 font-bold text-sm absolute left-3 top-2">
              {getCurrencySymbol(currency)}
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={totalAmount || ''}
              onChange={(e) => onTotalAmountChange(Number(e.target.value) || 0)}
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-sm font-bold text-zinc-100 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Payment Due Date</label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => onDueDateChange(e.target.value)}
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </div>

      <BillSplitAllocationSection
        calculatedShares={calculatedShares}
        profiles={profiles}
        currency={currency}
        customSharesCount={customSharesCount}
        excludedProfiles={excludedProfiles}
        sumPercentage={sumPercentage}
        isValidSplit={isValidSplit}
        onSplitEvenly={onSplitEvenly}
        onAutoBalance={onAutoBalance}
        onPercentageChange={onPercentageChange}
        onRemoveRoommate={onRemoveRoommate}
        onAddRoommate={onAddRoommate}
      />

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
          onClick={onConfirm}
          disabled={!isValidSplit || totalAmount <= 0 || !providerName.trim() || !dueDate || isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-xs shadow-glow transition-all"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span>{isSaving ? 'Uploading & Saving...' : 'Save Bill & Generate Splits'}</span>
        </button>
      </div>
    </div>
  );
};
