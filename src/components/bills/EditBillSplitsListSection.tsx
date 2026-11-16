import React from 'react';
import { Profile, SplitStatus } from '../../types';
import { getCurrencySymbol } from '../../lib/splitCalculator';
import { DEFAULT_AVATAR_URL } from '../../context/householdStorageAndNormalizers';
import { Scale, AlertCircle, Trash2, Plus } from 'lucide-react';

export interface ShareRow {
  id?: string;
  profileId: string;
  percentage: number;
  amountDue: number;
  status: SplitStatus;
  notes?: string;
}

interface EditBillSplitsListSectionProps {
  shares: ShareRow[];
  profiles: Profile[];
  excludedProfiles: Profile[];
  currency: string;
  totalAmount: number;
  sumPercentage: number;
  sumAmount: number;
  isValidSplit: boolean;
  onSplitEvenly: () => void;
  onAutoBalance: () => void;
  onPercentageChange: (profileId: string, newPct: number) => void;
  onAmountChange: (profileId: string, newAmt: number) => void;
  onRemoveRoommate: (profileId: string) => void;
  onAddRoommate: (profileId: string) => void;
}

export const EditBillSplitsListSection: React.FC<EditBillSplitsListSectionProps> = ({
  shares,
  profiles,
  excludedProfiles,
  currency,
  totalAmount,
  sumPercentage,
  sumAmount,
  isValidSplit,
  onSplitEvenly,
  onAutoBalance,
  onPercentageChange,
  onAmountChange,
  onRemoveRoommate,
  onAddRoommate,
}) => {
  const symbol = getCurrencySymbol(currency);

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
        <span className="text-xs font-semibold text-zinc-400 uppercase">
          Assigned Roommates ({shares.length})
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSplitEvenly}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors"
          >
            <Scale className="w-3.5 h-3.5 text-brand-400" />
            <span>Split Evenly</span>
          </button>
          {!isValidSplit && (
            <button
              type="button"
              onClick={onAutoBalance}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Auto-Balance</span>
            </button>
          )}
        </div>
      </div>

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
                  src={profile?.avatarUrl || DEFAULT_AVATAR_URL}
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
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={share.percentage}
                    onChange={(e) => onPercentageChange(share.profileId, Number(e.target.value))}
                    className="w-12 bg-transparent text-center font-bold text-zinc-100 focus:outline-none"
                  />
                  <span className="text-zinc-500 font-semibold">%</span>
                </div>

                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 w-24">
                  <span className="text-zinc-500 font-semibold">{symbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={share.amountDue}
                    onChange={(e) => onAmountChange(share.profileId, Number(e.target.value))}
                    className="w-full bg-transparent font-bold text-zinc-100 focus:outline-none text-right"
                  />
                </div>

                <button
                  type="button"
                  disabled={shares.length <= 1}
                  onClick={() => onRemoveRoommate(share.profileId)}
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
                onClick={() => onAddRoommate(p.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-brand-400" />
                <span>{p.fullName || p.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
        <div>
          <span className="text-zinc-400 block">Total Allocated:</span>
          <span className="font-bold text-zinc-200">
            {symbol}{sumAmount.toFixed(2)} / {symbol}{totalAmount.toFixed(2)}
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
    </>
  );
};
