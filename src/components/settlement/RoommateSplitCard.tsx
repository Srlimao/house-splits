import React, { useState } from 'react';
import { Profile, Bill, BillSplit, SplitStatus } from '../../types';
import { formatCurrency } from '../../lib/splitCalculator';
import {
  ShieldCheck,
  Clock,
  Check,
  Send,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';

interface SplitWithBill {
  split: BillSplit;
  bill: Bill;
}

interface RoommateSplitCardProps {
  roommate: Profile;
  splitsWithBills: SplitWithBill[];
  currency: string;
  isAdmin: boolean;
  isMe: boolean;
  onConfirmReceipt: (billId: string, profileId: string) => void;
  onDirectConfirm: (billId: string, profileId: string) => void;
  onRevertToPending: (billId: string, profileId: string) => void;
  onMarkPaid: (billId: string) => void;
}

export const RoommateSplitCard: React.FC<RoommateSplitCardProps> = ({
  roommate,
  splitsWithBills,
  currency,
  isAdmin,
  isMe,
  onConfirmReceipt,
  onDirectConfirm,
  onRevertToPending,
  onMarkPaid,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  let totalDue = 0;
  let totalSettled = 0;
  let totalAwaiting = 0;
  let totalPending = 0;

  splitsWithBills.forEach(({ split }) => {
    totalDue += split.amountDue;
    if (split.status === 'confirmed_by_admin') {
      totalSettled += split.amountDue;
    } else if (split.status === 'paid_to_admin') {
      totalAwaiting += split.amountDue;
    } else {
      totalPending += split.amountDue;
    }
  });

  const settledPercent = totalDue > 0 ? Math.round((totalSettled / totalDue) * 100) : 100;
  const isAllSettled = totalPending === 0 && totalAwaiting === 0 && splitsWithBills.length > 0;

  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 overflow-hidden transition-all hover:border-zinc-700/80">
      {/* Roommate Header Card */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3.5 cursor-pointer flex-1"
        >
          <div className="relative">
            <img
              src={roommate.avatarUrl}
              alt={roommate.fullName}
              className={`w-11 h-11 rounded-full object-cover ring-2 ${
                isAllSettled
                  ? 'ring-emerald-500/70'
                  : totalAwaiting > 0
                  ? 'ring-amber-500/70'
                  : 'ring-zinc-700'
              }`}
            />
            {isAllSettled && (
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-black rounded-full p-0.5">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-zinc-100 text-base">
                {roommate.fullName} {isMe ? '(You)' : ''}
              </h4>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                {roommate.role}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
              <span>{splitsWithBills.length} splits assigned</span>
              <span>•</span>
              <span className={isAllSettled ? 'text-emerald-400 font-semibold' : 'text-zinc-300'}>
                {settledPercent}% Settled
              </span>
            </div>
          </div>
        </div>

        {/* Totals & Badges */}
        <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-800/80">
          <div className="text-right">
            <span className="text-xs text-zinc-500 block">Total Share</span>
            <span className="text-base font-black text-white">
              {formatCurrency(totalDue, currency)}
            </span>
          </div>

          {totalPending > 0 && (
            <div className="text-right">
              <span className="text-xs text-rose-400 block font-medium">Unpaid</span>
              <span className="text-base font-bold text-rose-400">
                {formatCurrency(totalPending, currency)}
              </span>
            </div>
          )}

          {totalAwaiting > 0 && (
            <div className="text-right">
              <span className="text-xs text-amber-400 block font-medium">To Verify</span>
              <span className="text-base font-bold text-amber-400">
                {formatCurrency(totalAwaiting, currency)}
              </span>
            </div>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-zinc-800/60 h-1.5">
        <div
          className={`h-full transition-all duration-500 ${
            settledPercent === 100
              ? 'bg-emerald-500'
              : totalAwaiting > 0
              ? 'bg-gradient-to-r from-emerald-500 via-amber-500 to-amber-500'
              : 'bg-brand-500'
          }`}
          style={{ width: `${settledPercent}%` }}
        />
      </div>

      {/* Expandable Split Items */}
      {isExpanded && (
        <div className="p-4 sm:p-5 border-t border-zinc-800/80 bg-zinc-950/40 space-y-2.5">
          {splitsWithBills.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-2">No splits assigned to this roommate.</p>
          ) : (
            splitsWithBills.map(({ split, bill }) => (
              <div
                key={split.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-200">{bill.providerName}</span>
                    <span className="text-zinc-500 text-[11px]">Due: {bill.dueDate}</span>
                    {bill.invoiceNumber && (
                      <span className="text-[10px] font-mono text-zinc-500 px-1 py-0.2 rounded bg-zinc-800">
                        {bill.invoiceNumber}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    {split.percentage}% share of {formatCurrency(bill.totalAmount, currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                  <span className="font-bold text-sm text-zinc-100">
                    {formatCurrency(split.amountDue, currency)}
                  </span>

                  {split.status === 'confirmed_by_admin' ? (
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Paid & Confirmed</span>
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => onRevertToPending(bill.id, split.profileId)}
                          className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                          title="Revert status to Pending"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ) : split.status === 'paid_to_admin' ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Sent to Admin</span>
                      </span>

                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onConfirmReceipt(bill.id, split.profileId)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            <span>Confirm</span>
                          </button>
                          <button
                            onClick={() => onRevertToPending(bill.id, split.profileId)}
                            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                            title="Revert to Pending"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-[11px] font-medium">
                        <AlertCircle className="w-3 h-3 text-zinc-500" />
                        <span>Unpaid</span>
                      </span>

                      {isMe && !isAdmin && (
                        <button
                          onClick={() => onMarkPaid(bill.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-500 hover:bg-brand-400 text-black font-bold text-[11px] transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          <span>Mark Paid</span>
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => onDirectConfirm(bill.id, split.profileId)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-emerald-400 border border-zinc-700 text-[11px] font-semibold transition-colors"
                          title="Mark paid & confirmed"
                        >
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Mark Settled</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
