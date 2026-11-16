import React from 'react';
import { CalculatedShare, formatCurrency } from '../../lib/splitCalculator';
import { Profile } from '../../types';
import { DEFAULT_AVATAR_URL } from '../../context/householdStorageAndNormalizers';
import { Scale, AlertCircle, Trash2, Plus } from 'lucide-react';

interface BillSplitAllocationSectionProps {
  calculatedShares: CalculatedShare[];
  profiles: Profile[];
  currency: string;
  customSharesCount: number;
  excludedProfiles: Profile[];
  sumPercentage: number;
  isValidSplit: boolean;
  onSplitEvenly: () => void;
  onAutoBalance: () => void;
  onPercentageChange: (profileId: string, value: number) => void;
  onRemoveRoommate: (profileId: string) => void;
  onAddRoommate: (profileId: string) => void;
}

export const BillSplitAllocationSection: React.FC<BillSplitAllocationSectionProps> = ({
  calculatedShares,
  profiles,
  currency,
  customSharesCount,
  excludedProfiles,
  sumPercentage,
  isValidSplit,
  onSplitEvenly,
  onAutoBalance,
  onPercentageChange,
  onRemoveRoommate,
  onAddRoommate,
}) => {
  return (
    <div className="pt-2 border-t border-zinc-800 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs font-semibold text-zinc-400 uppercase">
          Roommate Split Allocation ({customSharesCount})
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

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {calculatedShares
          .filter((share) => profiles.some((p) => p.id === share.profileId))
          .map((share) => {
            const profile = profiles.find((p) => p.id === share.profileId);
            if (!profile) return null;
            const displayName = profile.fullName || profile.email?.split('@')[0] || 'Roommate';
            const initial = displayName.charAt(0).toUpperCase();
            const avatarSrc = profile.avatarUrl || DEFAULT_AVATAR_URL;

            return (
              <div
                key={share.profileId}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={avatarSrc}
                    alt={displayName}
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                      const next = (e.currentTarget as HTMLElement).nextElementSibling;
                      if (next) (next as HTMLElement).classList.remove('hidden');
                    }}
                  />
                  <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 font-bold text-[10px] items-center justify-center shrink-0 hidden">
                    {initial}
                  </div>
                  <span className="font-medium text-zinc-200 truncate">
                    {displayName} {profile.role === 'admin' ? '(Admin)' : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5">
                    <input
                      type="number"
                      step="0.1"
                      value={share.percentage}
                      onChange={(e) => onPercentageChange(share.profileId, Number(e.target.value))}
                      className="w-12 bg-transparent text-center text-xs font-bold text-zinc-100 focus:outline-none"
                    />
                    <span className="text-zinc-500 text-[11px]">%</span>
                  </div>

                  <span className="font-bold text-brand-400 text-xs w-16 text-right">
                    {formatCurrency(share.amountDue, currency)}
                  </span>

                  <button
                    type="button"
                    disabled={customSharesCount <= 1}
                    onClick={() => onRemoveRoommate(share.profileId)}
                    className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                    title="Exclude from this bill split"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {excludedProfiles.length > 0 && (
        <div className="pt-2 border-t border-zinc-800/80">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase block mb-1.5">
            Add Roommates to this Split
          </span>
          <div className="flex flex-wrap gap-1.5">
            {excludedProfiles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onAddRoommate(p.id)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white text-xs transition-colors"
              >
                <Plus className="w-3 h-3 text-brand-400" />
                <span>{p.fullName || p.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-zinc-500">Must equal 100.0% to save</span>
        <span className={`font-bold ${isValidSplit ? 'text-emerald-400' : 'text-rose-400'}`}>
          Sum: {sumPercentage.toFixed(1)}% {isValidSplit ? '✓ Valid' : '✗ Incomplete'}
        </span>
      </div>
    </div>
  );
};
