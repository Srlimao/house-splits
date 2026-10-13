import React, { useState } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { Bill } from '../../types';
import { BillCard } from './BillCard';
import { BillFilters, SplitFilterOption } from './BillFilters';
import { DocumentViewerModal } from './DocumentViewerModal';
import { EditBillSplitsModal } from './EditBillSplitsModal';
import confetti from 'canvas-confetti';

interface BillListProps {
  onOpenPaymentInfo?: () => void;
}

export const BillList: React.FC<BillListProps> = () => {
  const {
    bills,
    categories,
    profiles,
    household,
    activeProfile,
    togglePaidToProvider,
    markSplitPaidToAdmin,
    confirmSplitPayment,
    setSplitStatus,
    revertSplitToPending,
    removeBill,
  } = useHousehold();

  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [splitFilter, setSplitFilter] = useState<SplitFilterOption>('all');
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
  const [viewingDocumentBill, setViewingDocumentBill] = useState<Bill | null>(null);
  const [editingSplitsBill, setEditingSplitsBill] = useState<Bill | null>(null);
  const [billToDelete, setBillToDelete] = useState<string | null>(null);

  const isAdmin = activeProfile.role === 'admin';

  const getCategory = (catId: string) =>
    categories.find(
      (c) =>
        c.id === catId ||
        c.code === catId ||
        ('cat-' + c.code) === catId ||
        (c.code === 'electricity' && catId === 'cat-elec') ||
        (c.code === 'internet' && catId === 'cat-net')
    );

  const availableMonths = Array.from(
    new Set(
      bills.map((b) => (b.dueDate || b.issueDate || b.createdAt).substring(0, 7))
    )
  ).sort().reverse();

  const formatMonthLabel = (ym: string) => {
    const [year, month] = ym.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // Global counts for filter badges
  let totalAwaitingConfirmation = 0;
  let totalMyPendingSplits = 0;

  bills.forEach((b) => {
    b.splits.forEach((s) => {
      if (s.status === 'paid_to_admin') totalAwaitingConfirmation++;
      if (s.profileId === activeProfile.id && s.status === 'pending') totalMyPendingSplits++;
    });
  });

  const filteredBills = bills.filter((b) => {
    const billYm = (b.dueDate || b.issueDate || b.createdAt).substring(0, 7);
    if (selectedMonth !== 'all' && billYm !== selectedMonth) return false;
    if (selectedCategory !== 'all' && b.categoryId !== selectedCategory) return false;

    const hasUnpaidSplits = b.splits.some((s) => s.status === 'pending');
    const hasAwaitingSplits = b.splits.some((s) => s.status === 'paid_to_admin');
    const hasMyPending = b.splits.some((s) => s.profileId === activeProfile.id && s.status === 'pending');
    const isFullySettled = b.splits.length > 0 && b.splits.every((s) => s.status === 'confirmed_by_admin');

    if (splitFilter === 'unpaid' && !hasUnpaidSplits) return false;
    if (splitFilter === 'awaiting' && !hasAwaitingSplits) return false;
    if (splitFilter === 'my_pending' && !hasMyPending) return false;
    if (splitFilter === 'settled' && !isFullySettled) return false;

    return true;
  });

  const handleMarkPaid = (billId: string, notes?: string) => {
    markSplitPaidToAdmin(billId, activeProfile.id, notes);
    confetti({ particleCount: 35, spread: 55, origin: { y: 0.8 } });
  };

  const handleConfirmReceipt = (billId: string, profileId: string) => {
    confirmSplitPayment(billId, profileId);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
  };

  const handleDirectConfirm = (billId: string, profileId: string) => {
    setSplitStatus(billId, profileId, 'confirmed_by_admin');
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
  };

  const handleRevertToPending = (billId: string, profileId: string) => {
    revertSplitToPending(billId, profileId);
  };

  const handleDeleteBill = (billId: string) => {
    removeBill(billId);
    setBillToDelete(null);
  };

  return (
    <div className="space-y-4">
      {/* Month, Category & Split Status Filters */}
      <BillFilters
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        availableMonths={availableMonths}
        formatMonthLabel={formatMonthLabel}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        categories={categories}
        totalBillsCount={bills.length}
        splitFilter={splitFilter}
        onSelectSplitFilter={setSplitFilter}
        awaitingCount={totalAwaitingConfirmation}
        myPendingCount={totalMyPendingSplits}
      />

      {/* Bill Cards */}
      <div className="space-y-3">
        {filteredBills.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800/80">
            <p className="text-zinc-400 text-sm">No bills match the selected filters.</p>
          </div>
        ) : (
          filteredBills.map((bill) => (
            <BillCard
              key={bill.id}
              bill={bill}
              category={getCategory(bill.categoryId)}
              profiles={profiles}
              activeProfile={activeProfile}
              isAdmin={isAdmin}
              currency={household.currency}
              isExpanded={expandedBillId === bill.id}
              onToggleExpand={() => setExpandedBillId(expandedBillId === bill.id ? null : bill.id)}
              onEditSplits={() => setEditingSplitsBill(bill)}
              onViewDocument={() => setViewingDocumentBill(bill)}
              onDeleteBill={() => setBillToDelete(bill.id)}
              onTogglePaidToProvider={() => togglePaidToProvider(bill.id)}
              onMarkPaid={handleMarkPaid}
              onConfirmReceipt={handleConfirmReceipt}
              onDirectConfirm={handleDirectConfirm}
              onRevertToPending={handleRevertToPending}
            />
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {billToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h4 className="text-base font-bold text-white">Delete This Bill?</h4>
            <p className="text-xs text-zinc-400">
              Are you sure you want to remove this bill? This will delete the invoice and all associated roommate split shares.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setBillToDelete(null)}
                className="px-3 py-1.5 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteBill(billToDelete)}
                className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors"
              >
                Delete Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        bill={viewingDocumentBill}
        category={viewingDocumentBill ? getCategory(viewingDocumentBill.categoryId) : undefined}
        onClose={() => setViewingDocumentBill(null)}
      />

      {/* Edit Bill Splits Modal */}
      {editingSplitsBill && (
        <EditBillSplitsModal
          isOpen={Boolean(editingSplitsBill)}
          onClose={() => setEditingSplitsBill(null)}
          bill={editingSplitsBill}
        />
      )}
    </div>
  );
};
