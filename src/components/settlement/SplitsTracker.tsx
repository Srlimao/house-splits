import React, { useState, useMemo } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { formatYearMonthLabel, getBillReferenceDate } from '../../lib/splitCalculator';
import { RoommateSplitCard } from './RoommateSplitCard';
import { SplitsLedgerTable } from './SplitsLedgerTable';
import { SplitsMetricsCards } from './SplitsMetricsCards';
import { Bill, BillSplit, SplitStatus } from '../../types';
import { Search, Users, List } from 'lucide-react';
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
    isSystemManager,
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

  const isAdmin = activeProfile.role === 'admin' || isSystemManager;

  const availableMonths = useMemo(() => {
    return Array.from(
      new Set(
        bills
          .map((b) => getBillReferenceDate(b).substring(0, 7))
          .filter((ym) => /^\d{4}-\d{2}$/.test(ym))
      )
    )
      .sort()
      .reverse();
  }, [bills]);

  const allSplitsWithBills = useMemo(() => {
    const list: { split: BillSplit; bill: Bill }[] = [];
    bills.forEach((bill) => {
      const billYm = getBillReferenceDate(bill).substring(0, 7);
      if (selectedMonth !== 'all' && billYm !== selectedMonth) return;
      (bill.splits || []).forEach((split) => {
        list.push({ split, bill });
      });
    });
    return list;
  }, [bills, selectedMonth]);

  const metrics = useMemo(() => {
    let totalValue = 0;
    let totalSettled = 0;
    let totalAwaiting = 0;
    let totalPending = 0;
    let awaitingCount = 0;

    allSplitsWithBills.forEach(({ split }) => {
      const amt = Number(split.amountDue) || 0;
      totalValue += amt;
      if (split.status === 'confirmed_by_admin') {
        totalSettled += amt;
      } else if (split.status === 'paid_to_admin') {
        totalAwaiting += amt;
        awaitingCount++;
      } else {
        totalPending += amt;
      }
    });

    const percentSettled = totalValue > 0 ? Math.round((totalSettled / totalValue) * 100) : 100;
    return { totalValue, totalSettled, totalAwaiting, totalPending, awaitingCount, percentSettled };
  }, [allSplitsWithBills]);

  const filteredLedgerSplits = useMemo(() => {
    return allSplitsWithBills.filter(({ split, bill }) => {
      if (selectedProfileId !== 'all' && split.profileId !== selectedProfileId) return false;
      if (statusFilter !== 'all' && split.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const p = profiles.find((prof) => prof.id === split.profileId);
        const matchBill =
          bill.providerName?.toLowerCase().includes(q) || bill.invoiceNumber?.toLowerCase().includes(q);
        const matchRoommate = p?.fullName?.toLowerCase().includes(q);
        if (!matchBill && !matchRoommate) return false;
      }
      return true;
    });
  }, [allSplitsWithBills, selectedProfileId, statusFilter, searchQuery, profiles]);

  const handleConfirmAll = async () => {
    await confirmAllPendingSplits();
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
      <SplitsMetricsCards
        totalValue={metrics.totalValue}
        totalSettled={metrics.totalSettled}
        totalAwaiting={metrics.totalAwaiting}
        totalPending={metrics.totalPending}
        awaitingCount={metrics.awaitingCount}
        percentSettled={metrics.percentSettled}
        totalSharesCount={allSplitsWithBills.length}
        currency={household.currency}
        isAdmin={isAdmin}
        onConfirmAll={handleConfirmAll}
        onOpenPaymentInfo={onOpenPaymentInfo}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
        <div className="flex items-center gap-2">
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

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-100 focus:outline-none focus:border-brand-500 cursor-pointer"
          >
            <option value="all">All Months</option>
            {availableMonths.map((ym) => (
              <option key={ym} value={ym}>
                {formatYearMonthLabel(ym)}
              </option>
            ))}
          </select>
        </div>

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
                  <option key={p.id} value={p.id}>{p.fullName}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | SplitStatus)}
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
        <SplitsLedgerTable
          items={filteredLedgerSplits}
          profiles={profiles}
          activeProfileId={activeProfile.id}
          currency={household.currency}
          isAdmin={isAdmin}
          onConfirmSingle={handleConfirmSingle}
          onDirectConfirm={handleDirectConfirm}
          onRevertToPending={(billId, profId) => revertSplitToPending(billId, profId)}
          onMarkPaid={handleMarkPaid}
        />
      )}
    </div>
  );
};
