import React from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { formatCurrency } from '../../lib/splitCalculator';
import { ShieldCheck, Clock, AlertCircle, ArrowRight, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RoommateSettlementSummaryProps {
  onOpenSplitsTracker: () => void;
  onOpenPaymentInfo: () => void;
}

export const RoommateSettlementSummary: React.FC<RoommateSettlementSummaryProps> = ({
  onOpenSplitsTracker,
  onOpenPaymentInfo,
}) => {
  const { bills, profiles, household, activeProfile, confirmSplitPayment } = useHousehold();
  const isAdmin = activeProfile.role === 'admin';

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const currentMonthBills = bills.filter((b) => {
    const d = b.dueDate || b.issueDate || b.createdAt;
    return d.startsWith(currentYearMonth);
  });

  const handleQuickConfirm = (billId: string, profileId: string) => {
    confirmSplitPayment(billId, profileId);
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
  };

  return (
    <div className="rounded-2xl p-5 bg-zinc-900/40 border border-zinc-800/80 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
            <span>Roommate Split Status</span>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
              This Month
            </span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">Track who has paid their share of active bills.</p>
        </div>

        <button
          onClick={onOpenSplitsTracker}
          className="flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
        >
          <span>Splits Tracker</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {profiles.map((profile) => {
          let totalAssigned = 0;
          let totalSettled = 0;
          let totalAwaiting = 0;
          let totalUnpaid = 0;
          let pendingReviewBillId: string | null = null;

          currentMonthBills.forEach((b) => {
            b.splits.forEach((s) => {
              if (s.profileId === profile.id) {
                totalAssigned += s.amountDue;
                if (s.status === 'confirmed_by_admin') {
                  totalSettled += s.amountDue;
                } else if (s.status === 'paid_to_admin') {
                  totalAwaiting += s.amountDue;
                  if (!pendingReviewBillId) pendingReviewBillId = b.id;
                } else {
                  totalUnpaid += s.amountDue;
                }
              }
            });
          });

          const isMe = profile.id === activeProfile.id;
          const isAllPaid = totalUnpaid === 0 && totalAwaiting === 0 && totalAssigned > 0;

          return (
            <div
              key={profile.id}
              className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800/90 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5">
                <img
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                  className="w-9 h-9 rounded-full object-cover ring-1 ring-zinc-700"
                />
                <div>
                  <span className="font-bold text-zinc-200 block">
                    {profile.fullName} {isMe ? '(You)' : ''}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Total: {formatCurrency(totalAssigned, household.currency)}
                  </span>
                </div>
              </div>

              <div className="text-right flex flex-col items-end gap-1">
                {isAllPaid ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Settled</span>
                  </span>
                ) : totalAwaiting > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                      <Clock className="w-3 h-3" />
                      <span>{formatCurrency(totalAwaiting, household.currency)} Sent</span>
                    </span>
                    {isAdmin && pendingReviewBillId && (
                      <button
                        onClick={() => handleQuickConfirm(pendingReviewBillId!, profile.id)}
                        className="p-1 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
                        title="Verify Receipt"
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </button>
                    )}
                  </div>
                ) : totalUnpaid > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                      <AlertCircle className="w-3 h-3" />
                      <span>Owes {formatCurrency(totalUnpaid, household.currency)}</span>
                    </span>
                    {isMe && !isAdmin && (
                      <button
                        onClick={onOpenPaymentInfo}
                        className="px-2 py-0.5 rounded bg-brand-500 text-black text-[10px] font-bold"
                      >
                        Pay
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-zinc-500 text-[11px]">No splits</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
