import React from 'react';
import { Bill, BillSplit, Profile } from '../../types';
import { formatCurrency } from '../../lib/splitCalculator';
import { DEFAULT_AVATAR_URL } from '../../context/householdStorageAndNormalizers';
import { ShieldCheck, Clock, RotateCcw } from 'lucide-react';

interface SplitsLedgerTableProps {
  items: { split: BillSplit; bill: Bill }[];
  profiles: Profile[];
  activeProfileId: string;
  currency: string;
  isAdmin: boolean;
  onConfirmSingle: (billId: string, profileId: string) => void;
  onDirectConfirm: (billId: string, profileId: string) => void;
  onRevertToPending: (billId: string, profileId: string) => void;
  onMarkPaid: (billId: string) => void;
}

export const SplitsLedgerTable: React.FC<SplitsLedgerTableProps> = ({
  items,
  profiles,
  activeProfileId,
  currency,
  isAdmin,
  onConfirmSingle,
  onDirectConfirm,
  onRevertToPending,
  onMarkPaid,
}) => {
  return (
    <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/80 overflow-hidden">
      {items.length === 0 ? (
        <div className="p-12 text-center text-zinc-400 text-sm">
          No split items match your filter criteria.
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/80">
          {items.map(({ split, bill }) => {
            const profile = profiles.find((p) => p.id === split.profileId);
            const isMe = split.profileId === activeProfileId;

            return (
              <div
                key={split.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-zinc-900/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={profile?.avatarUrl || DEFAULT_AVATAR_URL}
                    alt={profile?.fullName || 'Roommate'}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-zinc-700"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-100">
                        {profile?.fullName || 'Roommate'} {isMe ? '(You)' : ''}
                      </span>
                      <span className="text-zinc-500">•</span>
                      <span className="font-medium text-zinc-300">{bill.providerName}</span>
                      {bill.invoiceNumber && (
                        <span className="font-mono text-[10px] text-zinc-500 bg-zinc-800 px-1 rounded">
                          {bill.invoiceNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      <span>{split.percentage}% share • Due: {bill.dueDate}</span>
                      {split.markedPaidAt && (
                        <span className="ml-2 text-zinc-500">
                          Paid: {new Date(split.markedPaidAt).toLocaleDateString()}
                        </span>
                      )}
                      {split.notes && <span className="ml-2 italic text-zinc-400">"{split.notes}"</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                  <span className="font-bold text-sm text-zinc-100">
                    {formatCurrency(split.amountDue, currency)}
                  </span>

                  {split.status === 'confirmed_by_admin' ? (
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Confirmed</span>
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => onRevertToPending(bill.id, split.profileId)}
                          className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300"
                          title="Revert to Pending"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ) : split.status === 'paid_to_admin' ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Needs Review</span>
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => onConfirmSingle(bill.id, split.profileId)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px]"
                        >
                          Confirm
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[11px]">Unpaid</span>
                      {isMe && !isAdmin && (
                        <button
                          onClick={() => onMarkPaid(bill.id)}
                          className="px-2.5 py-1 rounded-lg bg-brand-500 text-black font-bold text-[11px]"
                        >
                          Mark Paid
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => onDirectConfirm(bill.id, split.profileId)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-emerald-400 border border-zinc-700 text-[11px] font-semibold"
                        >
                          Settle
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
