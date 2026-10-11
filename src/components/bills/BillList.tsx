import React, { useState } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { formatCurrency } from '../../lib/splitCalculator';
import { Bill } from '../../types';
import { DocumentViewerModal } from './DocumentViewerModal';
import { EditBillSplitsModal } from './EditBillSplitsModal';
import {
  Zap,
  Droplet,
  Wifi,
  Home,
  Flame,
  FileText,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Send,
  Check,
  Download,
  Trash2,
  Calendar,
  Sliders,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BillListProps {
  onOpenPaymentInfo: () => void;
}

export const BillList: React.FC<BillListProps> = ({ onOpenPaymentInfo }) => {
  const {
    bills,
    categories,
    profiles,
    household,
    activeProfile,
    togglePaidToProvider,
    markSplitPaidToAdmin,
    confirmSplitPayment,
    removeBill,
  } = useHousehold();

  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unsettled' | 'settled'>('all');
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

  const getCategoryIcon = (iconName: string) => {
    switch (iconName?.toLowerCase()) {
      case 'zap': return <Zap className="w-4 h-4 text-amber-400" />;
      case 'droplet': return <Droplet className="w-4 h-4 text-cyan-400" />;
      case 'wifi': return <Wifi className="w-4 h-4 text-blue-400" />;
      case 'home': return <Home className="w-4 h-4 text-purple-400" />;
      case 'flame': return <Flame className="w-4 h-4 text-orange-400" />;
      default: return <FileText className="w-4 h-4 text-zinc-400" />;
    }
  };

  // Extract all unique months from bills ('YYYY-MM')
  const availableMonths = Array.from(
    new Set(
      bills.map((b) => {
        const d = b.dueDate || b.issueDate || b.createdAt;
        return d.substring(0, 7);
      })
    )
  ).sort().reverse();

  const formatMonthLabel = (ym: string) => {
    const [year, month] = ym.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const filteredBills = bills.filter((b) => {
    const billYm = (b.dueDate || b.issueDate || b.createdAt).substring(0, 7);
    if (selectedMonth !== 'all' && billYm !== selectedMonth) return false;
    if (selectedCategory !== 'all' && b.categoryId !== selectedCategory) return false;
    const isFullySettled = b.splits.every((s) => s.status === 'confirmed_by_admin');
    if (filterStatus === 'unsettled' && isFullySettled) return false;
    if (filterStatus === 'settled' && !isFullySettled) return false;
    return true;
  });

  const handleMarkPaid = (billId: string) => {
    markSplitPaidToAdmin(billId, activeProfile.id);
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
  };

  const handleConfirmReceipt = (billId: string, profileId: string) => {
    confirmSplitPayment(billId, profileId);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
  };

  const handleDeleteBill = (billId: string) => {
    removeBill(billId);
    setBillToDelete(null);
  };

  return (
    <div className="space-y-4">
      {/* Month & Category Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-zinc-800/80">
        
        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-400 shrink-0" />
          <span className="text-xs font-semibold text-zinc-400">Month:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-100 focus:outline-none focus:border-brand-500 cursor-pointer"
          >
            <option value="all">All Months & History</option>
            {availableMonths.map((ym) => (
              <option key={ym} value={ym}>
                {formatMonthLabel(ym)}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 self-start md:self-auto text-xs">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              filterStatus === 'all' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('unsettled')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              filterStatus === 'unsettled' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilterStatus('settled')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              filterStatus === 'settled' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Settled
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedCategory === 'all'
              ? 'bg-zinc-200 text-zinc-900'
              : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          All Categories ({bills.length})
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === c.id
                ? 'bg-brand-500 text-black'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Bill Cards */}
      <div className="space-y-3">
        {filteredBills.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800/80">
            <p className="text-zinc-400 text-sm">No bills found for the selected month and filters.</p>
          </div>
        ) : (
          filteredBills.map((bill) => {
            const cat = getCategory(bill.categoryId);
            const isExpanded = expandedBillId === bill.id;
            const settledCount = bill.splits.filter((s) => s.status === 'confirmed_by_admin').length;
            const mySplit = bill.splits.find((s) => s.profileId === activeProfile.id);

            return (
              <div
                key={bill.id}
                className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 overflow-hidden transition-all hover:border-zinc-700/80"
              >
                {/* Main Card Header */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div
                    onClick={() => setExpandedBillId(isExpanded ? null : bill.id)}
                    className="flex items-start gap-3 cursor-pointer flex-1"
                  >
                    <div className="p-3 rounded-xl bg-zinc-800/80 border border-zinc-700/60 mt-0.5">
                      {getCategoryIcon(cat?.icon || '')}
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
                        <span className="font-semibold text-zinc-300">{cat?.name}</span>
                        <span>•</span>
                        <span>Due: {bill.dueDate}</span>
                        <span>•</span>
                        {bill.paidToProvider ? (
                          <span className="text-emerald-400 font-medium">Paid to Provider</span>
                        ) : (
                          <span className="text-amber-400 font-medium">Provider Unpaid</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Total */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-800/80">
                    <div className="text-right">
                      <span className="text-xs text-zinc-500 block">Total</span>
                      <span className="text-lg font-black text-white">
                        {formatCurrency(bill.totalAmount, bill.currency)}
                      </span>
                    </div>

                    {/* Edit Splits Button */}
                    <button
                      onClick={() => setEditingSplitsBill(bill)}
                      className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-brand-400 border border-zinc-700/60 transition-colors"
                      title="Edit Roommate Splits Allocation"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>

                    {/* View/Download Document Button */}
                    <button
                      onClick={() => setViewingDocumentBill(bill)}
                      className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 transition-colors"
                      title="View & Download Original Bill Document"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* Admin Delete Bill Button */}
                    {isAdmin && (
                      <button
                        onClick={() => setBillToDelete(bill.id)}
                        className="p-2 rounded-xl bg-zinc-800/80 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 border border-zinc-700/60 hover:border-rose-500/30 transition-colors"
                        title="Remove / Delete Bill"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => setExpandedBillId(isExpanded ? null : bill.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                    >
                      <span>{settledCount}/{bill.splits.length} Paid</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Splits Breakdown Drawer */}
                {isExpanded && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-2 border-t border-zinc-800/80 bg-zinc-950/40 space-y-3">
                    <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                      <span>Roommate Breakdown</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setEditingSplitsBill(bill)}
                          className="flex items-center gap-1 text-[11px] font-medium text-brand-400 hover:underline"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Edit Splits</span>
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => togglePaidToProvider(bill.id)}
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
                          <div
                            key={split.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <img
                                src={profile?.avatarUrl}
                                alt={profile?.fullName}
                                className="w-7 h-7 rounded-full object-cover"
                              />
                              <div>
                                <span className="font-semibold text-zinc-200 block">
                                  {profile?.fullName} {isMe ? '(You)' : ''}
                                </span>
                                <span className="text-zinc-500 text-[11px]">
                                  {split.percentage}% share
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-bold text-sm text-zinc-100">
                                {formatCurrency(split.amountDue, bill.currency)}
                              </span>

                              {/* Status Badges & Actions */}
                              {split.status === 'confirmed_by_admin' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[11px]">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Confirmed</span>
                                </span>
                              ) : split.status === 'paid_to_admin' ? (
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold text-[11px]">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Sent to Admin</span>
                                  </span>

                                  {isAdmin && (
                                    <button
                                      onClick={() => handleConfirmReceipt(bill.id, split.profileId)}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] transition-colors"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>Confirm</span>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-zinc-500 text-[11px] font-medium">Pending</span>
                                  {isMe && !isAdmin && (
                                    <button
                                      onClick={() => handleMarkPaid(bill.id)}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-500 hover:bg-brand-400 text-black font-bold text-[11px] transition-colors"
                                    >
                                      <Send className="w-3 h-3" />
                                      <span>Mark Paid</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
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
