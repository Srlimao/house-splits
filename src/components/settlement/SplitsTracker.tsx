import React, { useState, useMemo } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { formatCurrency } from '../../lib/splitCalculator';
import { RoommateSplitCard } from './RoommateSplitCard';
import { SplitStatus } from '../../types';
import {
  Wallet,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Users,
  List,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  RotateCcw,
  Check,
  Send,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SplitsTrackerProps {
  onOpenPaymentInfo: () => void;
}

export const SplitsTracker: React.FC<SplitsTrackerProps> = ({ onOpenPaymentInfo }) => {
  const {
    bills,
    profiles,
    household,
    activeProfile,
    confirmSplitPayment,
    setSplitStatus,
    revertSplitToPending,
    confirmAllPendingSplits,
    markSplitPaidToAdmin,
  } = useHousehold();

  const [viewMode, setViewMode] = useState<'roommates' | 'ledger'>('roommates');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | SplitStatus>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isAdmin = activeProfile.role === 'admin';

  // Extract all unique months
  const availableMonths = useMemo(() => {
    return Array.from(
      new Set(bills.map((b) => (b.dueDate || b.issueDate || b.createdAt).substring(0, 7)))
    ).sort().reverse();
  }, [bills]);

  const formatMonthLabel = (ym: string) => {
    const [year, month] = ym.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // Compile all splits flattened with bill context
  const allSplitsWithBills = useMemo(() => {
    const list: { split: any; bill: any }[] = [];
    bills.forEach((bill) => {
      const billYm = (bill.dueDate || bill.issueDate || bill.createdAt).substring(0, 7);
      if (selectedMonth !== 'all' && billYm !== selectedMonth) return;

      bill.splits.forEach((split) => {
        list.push({ split, bill });
      });
    });
    return list;
  }, [bills, selectedMonth]);

  // Overall metric totals
  const metrics = useMemo(() => {
    let totalValue = 0;
    let totalSettled = 0;
    let totalAwaiting = 0;
    let totalPending = 0;
    let awaitingCount = 0;

    allSplitsWithBills.forEach(({ split }) => {
      totalValue += split.amountDue;
      if (split.status === 'confirmed_by_admin') {
        totalSettled += split.amountDue;
      } else if (split.status === 'paid_to_admin') {
        totalAwaiting += split.amountDue;
        awaitingCount++;
      } else {
        totalPending += split.amountDue;
      }
    });

    const percentSettled = totalValue > 0 ? Math.round((totalSettled / totalValue) * 100) : 100;
    return { totalValue, totalSettled, totalAwaiting, totalPending, awaitingCount, percentSettled };
  }, [allSplitsWithBills]);

  // Filtered splits for the ledger view
  const filteredLedgerSplits = useMemo(() => {
    return allSplitsWithBills.filter(({ split, bill }) => {
      if (selectedProfileId !== 'all' && split.profileId !== selectedProfileId) return false;
      if (statusFilter !== 'all' && split.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const p = profiles.find((prof) => prof.id === split.profileId);
        const matchBill = bill.providerName?.toLowerCase().includes(q) || bill.invoiceNumber?.toLowerCase().includes(q);
        const matchRoommate = p?.fullName?.toLowerCase().includes(q);
        if (!matchBill && !matchRoommate) return false;
      }
      return true;
    });
  }, [allSplitsWithBills, selectedProfileId, statusFilter, searchQuery, profiles]);

  const handleConfirmAll = async () => {
    const count = await confirmAllPendingSplits();
    confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
  };

  const handleConfirmSingle = (billId: string, profileId: string) => {
    confirmSplitPayment(billId, profileId);
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
  };

  const handleDirectConfirm = (billId: string, profileId: string) => {
    setSplitStatus(billId, profileId, 'confirmed_by_admin');
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
  };

  const handleMarkPaid = (billId: string) => {
    markSplitPaidToAdmin(billId, activeProfile.id);
    confetti({ particleCount: 35, spread: 55, origin: { y: 0.8 } });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Total Splits</span>
          <span className="text-xl sm:text-2xl font-black text-white">
            {formatCurrency(metrics.totalValue, household.currency)}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-1">{allSplitsWithBills.length} split shares</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-emerald-400">Settled & Verified</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400">
              {metrics.percentSettled}%
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-400">
            {formatCurrency(metrics.totalSettled, household.currency)}
          </span>
          <div className="w-full bg-zinc-800 h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${metrics.percentSettled}%` }} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-amber-400">Needs Admin Review</span>
            {metrics.awaitingCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 animate-pulse">
                {metrics.awaitingCount}
              </span>
            )}
          </div>
          <span className="text-xl sm:text-2xl font-black text-amber-400">
            {formatCurrency(metrics.totalAwaiting, household.currency)}
          </span>
          {isAdmin && metrics.awaitingCount > 0 && (
            <button
              onClick={handleConfirmAll}
              className="mt-2 w-full py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold transition-colors flex items-center justify-center gap-1"
            >
              <Check className="w-3 h-3 stroke-[3]" />
              <span>Verify All ({metrics.awaitingCount})</span>
            </button>
          )}
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <span className="text-[11px] font-semibold text-rose-400 block mb-1">Unpaid Balance</span>
          <span className="text-xl sm:text-2xl font-black text-rose-400">
            {formatCurrency(metrics.totalPending, household.currency)}
          </span>
          {!isAdmin && metrics.totalPending > 0 && (
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

      {/* Control Bar: View Switcher, Month, Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setViewMode('roommates')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${
                viewMode === 'roommates' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>By Roommate</span>
            </button>
            <button
              onClick={() => setViewMode('ledger')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${
                viewMode === 'ledger' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Splits Ledger</span>
            </button>
          </div>

          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-100 focus:outline-none focus:border-brand-500 cursor-pointer"
          >
            <option value="all">All Months</option>
            {availableMonths.map((ym) => (
              <option key={ym} value={ym}>
                {formatMonthLabel(ym)}
              </option>
            ))}
          </select>
        </div>

        {/* Search & Status Filters for Ledger */}
        <div className="flex flex-wrap items-center gap-2">
          {viewMode === 'ledger' && (
            <>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search provider / roommate..."
                  className="bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500 w-48"
                />
              </div>

              <select
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1 text-xs text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Roommates</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1 text-xs text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Unpaid Only</option>
                <option value="paid_to_admin">Needs Review Only</option>
                <option value="confirmed_by_admin">Settled Only</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'roommates' ? (
        <div className="space-y-4">
          {profiles.map((roommate) => {
            const roommateSplits = allSplitsWithBills.filter(({ split }) => split.profileId === roommate.id);
            return (
              <RoommateSplitCard
                key={roommate.id}
                roommate={roommate}
                splitsWithBills={roommateSplits}
                currency={household.currency}
                isAdmin={isAdmin}
                isMe={roommate.id === activeProfile.id}
                onConfirmReceipt={handleConfirmSingle}
                onDirectConfirm={handleDirectConfirm}
                onRevertToPending={(billId, profId) => revertSplitToPending(billId, profId)}
                onMarkPaid={handleMarkPaid}
              />
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/80 overflow-hidden">
          {filteredLedgerSplits.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 text-sm">No split items match your filter criteria.</div>
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {filteredLedgerSplits.map(({ split, bill }) => {
                const profile = profiles.find((p) => p.id === split.profileId);
                const isMe = split.profileId === activeProfile.id;

                return (
                  <div key={split.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-zinc-900/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <img src={profile?.avatarUrl} alt={profile?.fullName} className="w-8 h-8 rounded-full object-cover ring-1 ring-zinc-700" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-100">{profile?.fullName} {isMe ? '(You)' : ''}</span>
                          <span className="text-zinc-500">•</span>
                          <span className="font-medium text-zinc-300">{bill.providerName}</span>
                          {bill.invoiceNumber && <span className="font-mono text-[10px] text-zinc-500 bg-zinc-800 px-1 rounded">{bill.invoiceNumber}</span>}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          <span>{split.percentage}% share • Due: {bill.dueDate}</span>
                          {split.markedPaidAt && <span className="ml-2 text-zinc-500">Paid: {new Date(split.markedPaidAt).toLocaleDateString()}</span>}
                          {split.notes && <span className="ml-2 italic text-zinc-400">"{split.notes}"</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                      <span className="font-bold text-sm text-zinc-100">{formatCurrency(split.amountDue, household.currency)}</span>

                      {split.status === 'confirmed_by_admin' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[11px]">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Confirmed</span>
                          </span>
                          {isAdmin && (
                            <button onClick={() => revertSplitToPending(bill.id, split.profileId)} className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300" title="Revert to Pending">
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
                            <button onClick={() => handleConfirmSingle(bill.id, split.profileId)} className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px]">
                              Confirm
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[11px]">Unpaid</span>
                          {isMe && !isAdmin && (
                            <button onClick={() => handleMarkPaid(bill.id)} className="px-2.5 py-1 rounded-lg bg-brand-500 text-black font-bold text-[11px]">
                              Mark Paid
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={() => handleDirectConfirm(bill.id, split.profileId)} className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-emerald-400 border border-zinc-700 text-[11px] font-semibold">
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
      )}
    </div>
  );
};
