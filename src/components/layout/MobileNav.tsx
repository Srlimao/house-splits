import React from 'react';
import { LayoutDashboard, Receipt, SlidersHorizontal, Settings, Plus, Wallet } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';

interface MobileNavProps {
  activeTab: 'dashboard' | 'bills' | 'splits' | 'rules' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'bills' | 'splits' | 'rules' | 'settings') => void;
  onOpenScanner: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenScanner,
}) => {
  const { activeProfile, bills } = useHousehold();
  const isAdmin = activeProfile.role === 'admin';

  let pendingConfirmationCount = 0;
  bills.forEach((b) => {
    b.splits.forEach((s) => {
      if (s.status === 'paid_to_admin') pendingConfirmationCount++;
    });
  });

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c0f]/95 backdrop-blur-lg border-t border-zinc-800/80 px-2 py-2 safe-area-pb">
      <div className="flex items-center justify-around relative">
        
        {/* Dashboard Tab */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors ${
            activeTab === 'dashboard' ? 'text-brand-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </button>

        {/* Bills Tab */}
        <button
          onClick={() => setActiveTab('bills')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors ${
            activeTab === 'bills' ? 'text-brand-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px]">Bills</span>
        </button>

        {/* Center Scanner FAB for Admin */}
        {isAdmin && (
          <button
            onClick={onOpenScanner}
            className="flex items-center justify-center -mt-6 w-12 h-12 rounded-full bg-gradient-to-tr from-brand-600 to-emerald-400 text-black shadow-glow hover:scale-105 active:scale-95 transition-all p-2.5"
            title="Scan Utility Bill"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        )}

        {/* Splits Settlement Tracker Tab */}
        <button
          onClick={() => setActiveTab('splits')}
          className={`relative flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors ${
            activeTab === 'splits' ? 'text-brand-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[10px]">Splits</span>
          {pendingConfirmationCount > 0 && (
            <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        {/* Split Rules Tab */}
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors ${
            activeTab === 'rules' ? 'text-brand-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span className="text-[10px]">Rules</span>
        </button>

        {/* Settings Tab */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors ${
            activeTab === 'settings' ? 'text-brand-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px]">Settings</span>
        </button>

      </div>
    </nav>
  );
};
