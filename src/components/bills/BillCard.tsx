import React from 'react';
import { Bill, BillCategory, Profile } from '../../types';
import { formatCurrency } from '../../lib/splitCalculator';
import { BillSplitRow } from './BillSplitRow';
import {
  Zap,
  Droplet,
  Wifi,
  Home,
  Flame,
  FileText,
  ChevronDown,
  ChevronUp,
  Sliders,
  Download,
  Trash2,
  Check,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface BillCardProps {
  bill: Bill;
  category?: BillCategory;
  profiles: Profile[];
  activeProfile: Profile;
  isAdmin: boolean;
  currency: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEditSplits: () => void;
  onViewDocument: () => void;
  onDeleteBill: () => void;
  onTogglePaidToProvider: () => void;
  onMarkPaid: (billId: string, notes?: string) => void;
  onConfirmReceipt: (billId: string, profileId: string) => void;
  onDirectConfirm: (billId: string, profileId: string) => void;
  onRevertToPending: (billId: string, profileId: string) => void;
}

export const BillCard: React.FC<BillCardProps> = ({
  bill,
  category,
  profiles,
  activeProfile,
  isAdmin,
  currency,
  isExpanded,
  onToggleExpand,
  onEditSplits,
  onViewDocument,
  onDeleteBill,
  onTogglePaidToProvider,
  onMarkPaid,
  onConfirmReceipt,
  onDirectConfirm,
  onRevertToPending,
}) => {
  const getCategoryIcon = (iconName?: string) => {
    switch (iconName?.toLowerCase()) {
      case 'zap': return <Zap className="w-4 h-4 text-amber-400" />;
      case 'droplet': return <Droplet className="w-4 h-4 text-cyan-400" />;
      case 'wifi': return <Wifi className="w-4 h-4 text-blue-400" />;
      case 'home': return <Home className="w-4 h-4 text-purple-400" />;
      case 'flame': return <Flame className="w-4 h-4 text-orange-400" />;
      default: return <FileText className="w-4 h-4 text-zinc-400" />;
    }
  };

  const confirmedCount = bill.splits.filter((s) => s.status === 'confirmed_by_admin').length;
  const awaitingCount = bill.splits.filter((s) => s.status === 'paid_to_admin').length;
  const isFullySettled = confirmedCount === bill.splits.length && bill.splits.length > 0;

  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 overflow-hidden transition-all hover:border-zinc-700/80">
      {/* Main Card Header */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          onClick={onToggleExpand}
          className="flex items-start gap-3 cursor-pointer flex-1"
        >
          <div className="p-3 rounded-xl bg-zinc-800/80 border border-zinc-700/60 mt-0.5">
            {getCategoryIcon(category?.icon)}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-zinc-100 text-base">{bill.providerName}</h4>
              {bill.invoiceNumber && (
                <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-800">
                  {bill.invoiceNumber}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-zinc-400">
              <span className="font-semibold text-zinc-300">{category?.name || 'Bill'}</span>
              <span>•</span>
              <span>Due: {bill.dueDate}</span>
              <span>•</span>
              {bill.paidToProvider ? (
                <span className="text-emerald-400 font-medium">Provider Paid</span>
              ) : (
                <span className="text-amber-400 font-medium">Provider Unpaid</span>
              )}
            </div>

            {/* Roommate Split Payment Status Chips - Instant visual check without clicking */}
            <div className="flex items-center gap-1.5 mt-2.5">
              <span className="text-[10px] text-zinc-400 font-medium mr-1">Splits:</span>
              <div className="flex items-center -space-x-1.5">
                {bill.splits.map((s) => {
                  const p = profiles.find((prof) => prof.id === s.profileId);
                  const isConfirmed = s.status === 'confirmed_by_admin';
                  const isSent = s.status === 'paid_to_admin';

                  return (
                    <div
                      key={s.id}
                      className="relative group/avatar"
                      title={`${p?.fullName || 'Roommate'}: ${
                        isConfirmed ? 'Paid & Confirmed' : isSent ? 'Sent to Admin' : 'Unpaid'
                      } (${formatCurrency(s.amountDue, currency)})`}
                    >
                      <img
                        src={p?.avatarUrl}
                        alt={p?.fullName}
                        className={`w-6 h-6 rounded-full object-cover ring-2 ${
                          isConfirmed
                            ? 'ring-emerald-500/80'
                            : isSent
                            ? 'ring-amber-500/80 animate-pulse'
                            : 'ring-zinc-700 opacity-60'
                        }`}
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full flex items-center justify-center border border-zinc-900 ${
                          isConfirmed
                            ? 'bg-emerald-500 text-black'
                            : isSent
                            ? 'bg-amber-500 text-black'
                            : 'bg-zinc-700 text-zinc-300'
                        }`}
                      >
                        {isConfirmed ? (
                          <Check className="w-1.5 h-1.5 stroke-[3]" />
                        ) : isSent ? (
                          <Clock className="w-1.5 h-1.5 stroke-[3]" />
                        ) : (
                          <span className="w-1 h-1 bg-zinc-400 rounded-full" />
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              {awaitingCount > 0 && (
                <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {awaitingCount} awaiting review
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Total & Action Buttons */}
        <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-800/80">
          <div className="text-right">
            <span className="text-xs text-zinc-500 block">Total</span>
            <span className="text-lg font-black text-white">
              {formatCurrency(bill.totalAmount, currency)}
            </span>
          </div>

          <button
            onClick={onEditSplits}
            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-brand-400 border border-zinc-700/60 transition-colors"
            title="Edit Splits & Details"
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            onClick={onViewDocument}
            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 transition-colors"
            title="View Original Document"
          >
            <Download className="w-4 h-4" />
          </button>

          {isAdmin && (
            <button
              onClick={onDeleteBill}
              className="p-2 rounded-xl bg-zinc-800/80 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 border border-zinc-700/60 hover:border-rose-500/30 transition-colors"
              title="Delete Bill"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onToggleExpand}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-colors ${
              isFullySettled
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/40'
                : 'bg-zinc-800 border-zinc-700/60 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <span>
              {confirmedCount}/{bill.splits.length} Paid
            </span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Splits Drawer */}
      {isExpanded && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-2 border-t border-zinc-800/80 bg-zinc-950/40 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase tracking-wider">
            <span>Roommate Breakdown</span>
            <div className="flex items-center gap-3">
              <button
                onClick={onEditSplits}
                className="flex items-center gap-1 text-[11px] font-medium text-brand-400 hover:underline"
              >
                <Sliders className="w-3 h-3" />
                <span>Adjust Shares</span>
              </button>
              {isAdmin && (
                <button
                  onClick={onTogglePaidToProvider}
                  className="text-[11px] font-medium text-zinc-400 hover:text-white"
                >
                  {bill.paidToProvider ? 'Unmark Provider Payment' : 'Mark Paid to Provider'}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {bill.splits.map((split) => {
              const profile = profiles.find((p) => p.id === split.profileId);
              const isMe = split.profileId === activeProfile.id;

              return (
                <BillSplitRow
                  key={split.id}
                  bill={bill}
                  split={split}
                  profile={profile}
                  isAdmin={isAdmin}
                  isMe={isMe}
                  currency={currency}
                  onMarkPaid={onMarkPaid}
                  onConfirmReceipt={onConfirmReceipt}
                  onDirectConfirm={onDirectConfirm}
                  onRevertToPending={onRevertToPending}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
