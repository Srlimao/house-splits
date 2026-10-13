import React, { useState } from 'react';
import { Bill, BillSplit, Profile } from '../../types';
import { formatCurrency } from '../../lib/splitCalculator';
import { ShieldCheck, Clock, Check, Send, AlertCircle, RotateCcw } from 'lucide-react';

interface BillSplitRowProps {
  bill: Bill;
  split: BillSplit;
  profile?: Profile;
  isAdmin: boolean;
  isMe: boolean;
  currency: string;
  onMarkPaid: (billId: string, notes?: string) => void;
  onConfirmReceipt: (billId: string, profileId: string) => void;
  onDirectConfirm?: (billId: string, profileId: string) => void;
  onRevertToPending?: (billId: string, profileId: string) => void;
}

export const BillSplitRow: React.FC<BillSplitRowProps> = ({
  bill,
  split,
  profile,
  isAdmin,
  isMe,
  currency,
  onMarkPaid,
  onConfirmReceipt,
  onDirectConfirm,
  onRevertToPending,
}) => {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [paymentNote, setPaymentNote] = useState('');

  const formatTimestamp = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const handleMarkPaidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onMarkPaid(bill.id, paymentNote || undefined);
    setShowNoteInput(false);
    setPaymentNote('');
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img
              src={profile?.avatarUrl}
              alt={profile?.fullName || 'Roommate'}
              className="w-7 h-7 rounded-full object-cover ring-1 ring-zinc-700"
            />
            {split.status === 'confirmed_by_admin' && (
              <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border border-zinc-900 flex items-center justify-center">
                <Check className="w-2 h-2 text-black stroke-[3]" />
              </span>
            )}
            {split.status === 'paid_to_admin' && (
              <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border border-zinc-900 flex items-center justify-center">
                <Clock className="w-2 h-2 text-black stroke-[3]" />
              </span>
            )}
          </div>
          <div>
            <span className="font-semibold text-zinc-200 block">
              {profile?.fullName || 'Roommate'} {isMe ? '(You)' : ''}
            </span>
            <span className="text-zinc-500 text-[11px]">
              {split.percentage}% share
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-bold text-sm text-zinc-100">
            {formatCurrency(split.amountDue, currency)}
          </span>

          {/* Status Badges & Quick Actions */}
          {split.status === 'confirmed_by_admin' ? (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Paid & Confirmed</span>
              </span>
              {isAdmin && onRevertToPending && (
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
                  {onRevertToPending && (
                    <button
                      onClick={() => onRevertToPending(bill.id, split.profileId)}
                      className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                      title="Reject / Revert to Pending"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 text-[11px] font-medium">
                <AlertCircle className="w-3 h-3 text-zinc-500" />
                <span>Unpaid</span>
              </span>

              {/* Roommate marking their own share paid */}
              {isMe && !isAdmin && (
                <button
                  onClick={() => setShowNoteInput(!showNoteInput)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-500 hover:bg-brand-400 text-black font-bold text-[11px] transition-colors"
                >
                  <Send className="w-3 h-3" />
                  <span>Mark Paid</span>
                </button>
              )}

              {/* Admin direct verification (e.g. roommate paid cash or bank directly) */}
              {isAdmin && onDirectConfirm && (
                <button
                  onClick={() => onDirectConfirm(bill.id, split.profileId)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-emerald-400 border border-zinc-700 text-[11px] font-semibold transition-colors"
                  title="Mark as paid & confirmed directly"
                >
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Mark Settled</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment details / timestamps / notes */}
      {(split.markedPaidAt || split.confirmedPaidAt || split.notes) && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-800/60 text-[11px] text-zinc-400">
          {split.markedPaidAt && (
            <span>Paid: {formatTimestamp(split.markedPaidAt)}</span>
          )}
          {split.confirmedPaidAt && (
            <>
              <span>•</span>
              <span className="text-emerald-400/90">Verified: {formatTimestamp(split.confirmedPaidAt)}</span>
            </>
          )}
          {split.notes && (
            <>
              <span>•</span>
              <span className="italic text-zinc-400">"{split.notes}"</span>
            </>
          )}
        </div>
      )}

      {/* Note input popout for roommate */}
      {showNoteInput && (
        <form onSubmit={handleMarkPaidSubmit} className="pt-2 border-t border-zinc-800/80 flex items-center gap-2">
          <input
            type="text"
            value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)}
            placeholder="Optional note (e.g. Revolut / Bank ref)..."
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            className="px-3 py-1 rounded-lg bg-brand-500 hover:bg-brand-400 text-black font-bold text-xs"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setShowNoteInput(false)}
            className="px-2 py-1 rounded-lg text-zinc-400 hover:text-white text-xs"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
};
