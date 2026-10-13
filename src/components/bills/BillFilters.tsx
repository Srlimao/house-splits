import React from 'react';
import { BillCategory } from '../../types';
import { Calendar, Filter } from 'lucide-react';

export type SplitFilterOption = 'all' | 'unpaid' | 'awaiting' | 'my_pending' | 'settled';

interface BillFiltersProps {
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  availableMonths: string[];
  formatMonthLabel: (ym: string) => string;
  selectedCategory: string;
  onSelectCategory: (catId: string) => void;
  categories: BillCategory[];
  totalBillsCount: number;
  splitFilter: SplitFilterOption;
  onSelectSplitFilter: (filter: SplitFilterOption) => void;
  awaitingCount: number;
  myPendingCount: number;
}

export const BillFilters: React.FC<BillFiltersProps> = ({
  selectedMonth,
  onSelectMonth,
  availableMonths,
  formatMonthLabel,
  selectedCategory,
  onSelectCategory,
  categories,
  totalBillsCount,
  splitFilter,
  onSelectSplitFilter,
  awaitingCount,
  myPendingCount,
}) => {
  return (
    <div className="space-y-3 pb-2 border-b border-zinc-800/80">
      {/* Top Filter Bar: Month & Split Status Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-400 shrink-0" />
          <span className="text-xs font-semibold text-zinc-400">Month:</span>
          <select
            value={selectedMonth}
            onChange={(e) => onSelectMonth(e.target.value)}
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

        {/* Split Payment Status Tabs */}
        <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-xl p-1 overflow-x-auto scrollbar-none text-xs">
          <button
            onClick={() => onSelectSplitFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
              splitFilter === 'all'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All Bills
          </button>
          <button
            onClick={() => onSelectSplitFilter('unpaid')}
            className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
              splitFilter === 'unpaid'
                ? 'bg-zinc-800 text-rose-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Unpaid Splits
          </button>
          <button
            onClick={() => onSelectSplitFilter('awaiting')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
              splitFilter === 'awaiting'
                ? 'bg-zinc-800 text-amber-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Needs Review</span>
            {awaitingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                {awaitingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onSelectSplitFilter('my_pending')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
              splitFilter === 'my_pending'
                ? 'bg-zinc-800 text-brand-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>I Owe</span>
            {myPendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-brand-500/20 text-brand-400 text-[10px] font-bold">
                {myPendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onSelectSplitFilter('settled')}
            className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
              splitFilter === 'settled'
                ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Settled
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => onSelectCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedCategory === 'all'
              ? 'bg-zinc-200 text-zinc-900'
              : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          All Categories ({totalBillsCount})
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelectCategory(c.id)}
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
    </div>
  );
};
