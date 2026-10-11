import React from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { formatCurrency } from '../../lib/splitCalculator';
import { Zap, Droplet, Wifi, Home, Flame, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface DueSoonListProps {
  onSelectBill: (billId: string) => void;
}

export const DueSoonList: React.FC<DueSoonListProps> = ({ onSelectBill }) => {
  const { bills, categories, household, activeProfile } = useHousehold();

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

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const currentMonthBills = bills.filter((b) => {
    const billDate = b.dueDate || b.issueDate || b.createdAt;
    return billDate.startsWith(currentYearMonth);
  });

  const sortedBills = [...currentMonthBills].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  return (
    <div className="rounded-2xl p-6 bg-zinc-900/40 border border-zinc-800/80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-base text-zinc-100 flex items-center gap-2">
          <span>Current Month Bills</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-normal">
            {currentMonthBills.length}
          </span>
        </h3>
      </div>

      <div className="space-y-3">
        {sortedBills.slice(0, 4).map((bill) => {
          const cat = getCategory(bill.categoryId);
          const daysLeft = differenceInDays(parseISO(bill.dueDate), new Date());
          const confirmedCount = bill.splits.filter((s) => s.status === 'confirmed_by_admin').length;
          const mySplit = bill.splits.find((s) => s.profileId === activeProfile.id);

          return (
            <div
              key={bill.id}
              onClick={() => onSelectBill(bill.id)}
              className="group p-3.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/70 border border-zinc-800/60 hover:border-zinc-700/80 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700/50 group-hover:scale-105 transition-transform">
                  {getCategoryIcon(cat?.icon || '')}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-brand-400 transition-colors">
                    {bill.providerName}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span>{cat?.name || 'Utility'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      {daysLeft < 0 ? (
                        <span className="text-rose-400 font-medium">Overdue</span>
                      ) : daysLeft === 0 ? (
                        <span className="text-amber-400 font-medium">Due today</span>
                      ) : (
                        <span>Due in {daysLeft} days</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800/60">
                <div className="text-right">
                  <span className="text-xs text-zinc-400 block">Total</span>
                  <span className="text-sm font-bold text-zinc-100">
                    {formatCurrency(bill.totalAmount, bill.currency)}
                  </span>
                </div>

                {/* My Share Pill */}
                {mySplit && (
                  <div className="text-right">
                    <span className="text-xs text-zinc-400 block">Your Share</span>
                    <span className="text-sm font-bold text-brand-400">
                      {formatCurrency(mySplit.amountDue, bill.currency)}
                    </span>
                  </div>
                )}

                {/* Status Indicator */}
                <div className="flex items-center gap-1 text-xs">
                  {confirmedCount === bill.splits.length ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Settled</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium">
                      <span>{confirmedCount}/{bill.splits.length} paid</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
