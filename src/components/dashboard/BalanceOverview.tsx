import React from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { formatCurrency } from '../../lib/splitCalculator';
import { Wallet, ArrowUpRight, CheckCircle2, Clock, Copy, Check } from 'lucide-react';

interface BalanceOverviewProps {
  onOpenPaymentInfo: () => void;
  onOpenScanner: () => void;
}

export const BalanceOverview: React.FC<BalanceOverviewProps> = ({
  onOpenPaymentInfo,
  onOpenScanner,
}) => {
  const { household, activeProfile, bills, profiles } = useHousehold();
  const [copied, setCopied] = React.useState(false);

  const isAdmin = activeProfile.role === 'admin';

  const now = new Date();
  const currentMonthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Dashboard strictly displays the current month
  const currentMonthBills = bills.filter((bill) => {
    const billDate = bill.dueDate || bill.issueDate || bill.createdAt;
    return billDate.startsWith(currentYearMonth);
  });

  // Calculations for Admin perspective
  let totalOwedToAdmin = 0;
  let totalPendingConfirmation = 0;
  let totalPaidByAdmin = 0;

  // Calculations for Roommate perspective
  let myTotalOwed = 0;
  let myPendingConfirmation = 0;
  let myTotalSettled = 0;

  const adminProfile = profiles.find((p) => p.role === 'admin');
  const adminId = adminProfile?.id || 'user-admin';

  currentMonthBills.forEach((bill) => {
    if (bill.paidToProvider) {
      totalPaidByAdmin += bill.totalAmount;
    }

    bill.splits.forEach((split) => {
      // Roommate owes Admin if profileId is not the admin
      const isSplitFromOtherMember = split.profileId !== adminId && split.profileId !== 'user-admin';

      if (isSplitFromOtherMember) {
        if (split.status === 'pending') {
          totalOwedToAdmin += split.amountDue;
        } else if (split.status === 'paid_to_admin') {
          totalPendingConfirmation += split.amountDue;
        }
      }

      // If this split belongs to the actively logged-in user
      if (split.profileId === activeProfile.id) {
        if (split.status === 'pending') {
          myTotalOwed += split.amountDue;
        } else if (split.status === 'paid_to_admin') {
          myPendingConfirmation += split.amountDue;
        } else if (split.status === 'confirmed_by_admin') {
          myTotalSettled += split.amountDue;
        }
      }
    });
  });

  const handleCopyIban = () => {
    if (household.adminPaymentInfo.iban) {
      navigator.clipboard.writeText(household.adminPaymentInfo.iban);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Primary Highlight Card */}
      <div className="md:col-span-2 relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-zinc-900/90 via-zinc-900/50 to-zinc-950 border border-zinc-800/80 shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Wallet className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {isAdmin ? 'Admin Settlement Balance' : 'Your Balance to Admin'}
            </span>
          </div>

          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
            {currentMonthName}
          </span>
        </div>

        {isAdmin ? (
          <div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
              {formatCurrency(totalOwedToAdmin + totalPendingConfirmation, household.currency)}
            </div>
            <p className="text-sm text-zinc-400 mb-6">
              Total outstanding balance owed to you by roommates across active bills.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-800/70">
              <div>
                <span className="text-xs text-zinc-500 block mb-0.5">Awaiting Transfer</span>
                <span className="text-base font-bold text-amber-400">
                  {formatCurrency(totalOwedToAdmin, household.currency)}
                </span>
              </div>
              <div>
                <span className="text-xs text-zinc-500 block mb-0.5">Ready for Verification</span>
                <span className="text-base font-bold text-emerald-400">
                  {formatCurrency(totalPendingConfirmation, household.currency)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
              {formatCurrency(myTotalOwed, household.currency)}
            </div>
            <p className="text-sm text-zinc-400 mb-6">
              Your pending share of rent and utilities owed to the House Admin.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-zinc-800/70">
              <button
                onClick={onOpenPaymentInfo}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-black font-semibold text-xs transition-colors shadow-glow"
              >
                <span>Pay Admin (Bank / Revolut)</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>

              {household.adminPaymentInfo.iban && (
                <button
                  onClick={handleCopyIban}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700/60 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'IBAN Copied!' : 'Copy IBAN'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Secondary Summary Card */}
      <div className="rounded-2xl p-6 bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
              Current Month Total
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
              {currentMonthName}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-1">
            {formatCurrency(
              currentMonthBills.reduce((acc, b) => acc + b.totalAmount, 0),
              household.currency
            )}
          </div>
          <p className="text-xs text-zinc-500">
            Across {currentMonthBills.length} bills this month ({profiles.length} roommates sharing).
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-800/70 flex items-center justify-between text-xs">
          <span className="text-zinc-400">
            {isAdmin ? 'Official Bills Paid:' : 'Your Settled Shares:'}
          </span>
          <span className="font-semibold text-zinc-200">
            {isAdmin
              ? formatCurrency(totalPaidByAdmin, household.currency)
              : formatCurrency(myTotalSettled, household.currency)}
          </span>
        </div>
      </div>
    </div>
  );
};
