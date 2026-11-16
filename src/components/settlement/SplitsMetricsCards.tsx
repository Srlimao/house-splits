import React from 'react';
import { formatCurrency } from '../../lib/splitCalculator';
import { Check, ArrowUpRight } from 'lucide-react';

interface SplitsMetricsCardsProps {
  totalValue: number;
  totalSettled: number;
  totalAwaiting: number;
  totalPending: number;
  awaitingCount: number;
  percentSettled: number;
  totalSharesCount: number;
  currency: string;
  isAdmin: boolean;
  onConfirmAll: () => void;
  onOpenPaymentInfo: () => void;
}

export const SplitsMetricsCards: React.FC<SplitsMetricsCardsProps> = ({
  totalValue,
  totalSettled,
  totalAwaiting,
  totalPending,
  awaitingCount,
  percentSettled,
  totalSharesCount,
  currency,
  isAdmin,
  onConfirmAll,
  onOpenPaymentInfo,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
        <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Total Splits</span>
        <span className="text-xl sm:text-2xl font-black text-white">
          {formatCurrency(totalValue, currency)}
        </span>
        <span className="text-[11px] text-zinc-500 block mt-1">{totalSharesCount} split shares</span>
      </div>

      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold text-emerald-400">Settled &amp; Verified</span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400">
            {percentSettled}%
          </span>
        </div>
        <span className="text-xl sm:text-2xl font-black text-emerald-400">
          {formatCurrency(totalSettled, currency)}
        </span>
        <div className="w-full bg-zinc-800 h-1 rounded-full mt-2 overflow-hidden">
          <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${percentSettled}%` }} />
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold text-amber-400">Needs Admin Review</span>
          {awaitingCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 animate-pulse">
              {awaitingCount}
            </span>
          )}
        </div>
        <span className="text-xl sm:text-2xl font-black text-amber-400">
          {formatCurrency(totalAwaiting, currency)}
        </span>
        {isAdmin && awaitingCount > 0 && (
          <button
            onClick={onConfirmAll}
            className="mt-2 w-full py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold transition-colors flex items-center justify-center gap-1"
          >
            <Check className="w-3 h-3 stroke-[3]" />
            <span>Verify All ({awaitingCount})</span>
          </button>
        )}
      </div>

      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
        <span className="text-[11px] font-semibold text-rose-400 block mb-1">Unpaid Balance</span>
        <span className="text-xl sm:text-2xl font-black text-rose-400">
          {formatCurrency(totalPending, currency)}
        </span>
        {!isAdmin && totalPending > 0 && (
          <button
            onClick={onOpenPaymentInfo}
            className="mt-2 w-full py-1 rounded-lg bg-brand-500 hover:bg-brand-400 text-black text-[11px] font-bold transition-colors flex items-center justify-center gap-1 shadow-glow"
          >
            <span>Pay Admin</span>
            <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
          </button>
        )}
      </div>
    </div>
  );
};
