import React, { useState } from 'react';
import { HouseholdProvider, useHousehold } from './context/HouseholdContext';
import { Navbar } from './components/layout/Navbar';
import { MobileNav } from './components/layout/MobileNav';
import { BalanceOverview } from './components/dashboard/BalanceOverview';
import { DueSoonList } from './components/dashboard/DueSoonList';
import { BillList } from './components/bills/BillList';
import { SplitRulesManager } from './components/settings/SplitRulesManager';
import { BillScannerModal } from './components/scanner/BillScannerModal';
import { HouseholdSettingsModal } from './components/settings/HouseholdSettingsModal';
import { PaymentInfoModal } from './components/settlement/PaymentInfoModal';
import { RoommateManagerModal } from './components/roommates/RoommateManagerModal';
import { JoinHouseModal } from './components/auth/JoinHouseModal';
import { Sparkles, Receipt, SlidersHorizontal, Plus, Users, UserPlus } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { activeProfile, bills, profiles } = useHousehold();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bills' | 'rules' | 'settings'>('dashboard');

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPaymentInfoOpen, setIsPaymentInfoOpen] = useState(false);
  const [isRoommatesOpen, setIsRoommatesOpen] = useState(false);
  const [isJoinHouseOpen, setIsJoinHouseOpen] = useState(() => {
    return new URLSearchParams(window.location.search).has('invite');
  });

  const isAdmin = activeProfile.role === 'admin';

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col pb-24 sm:pb-12">
      {/* Top Navigation */}
      <Navbar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenRoommates={() => setIsRoommatesOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Desktop Tabs Header */}
        <div className="hidden sm:flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('bills')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'bills'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>Bills & Ledger</span>
              <span className="px-1.5 py-0.5 rounded-full bg-zinc-700 text-[10px]">
                {bills.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'rules'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Split Rules</span>
            </button>
          </div>

          {/* Action button in header */}
          {isAdmin && (
            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-500 hover:from-brand-500 hover:to-emerald-400 text-black font-bold text-xs shadow-glow transition-transform hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Scan Utility Bill</span>
            </button>
          )}
        </div>

        {/* Tab View Routing */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <BalanceOverview
              onOpenPaymentInfo={() => setIsPaymentInfoOpen(true)}
              onOpenScanner={() => setIsScannerOpen(true)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <DueSoonList onSelectBill={() => setActiveTab('bills')} />
              </div>

              {/* Right Sidebar: Roommates & Split Rules */}
              <div className="space-y-4">
                {/* Roommates Panel */}
                <div className="rounded-2xl p-5 bg-zinc-900/40 border border-zinc-800/80">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-brand-400" />
                      <h3 className="font-bold text-sm text-zinc-100">Roommates ({profiles.length})</h3>
                    </div>
                    <button
                      onClick={() => setIsRoommatesOpen(true)}
                      className="text-xs text-brand-400 hover:underline font-semibold"
                    >
                      Invite / Code
                    </button>
                  </div>

                  <div className="flex items-center -space-x-2 mb-4">
                    {profiles.map((p) => (
                      <img
                        key={p.id}
                        src={p.avatarUrl}
                        alt={p.fullName}
                        title={`${p.fullName} (${p.role})`}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-zinc-900"
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => setIsRoommatesOpen(true)}
                    className="w-full py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-700/60 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Manage & Invite Roommates</span>
                  </button>
                </div>

                {/* Quick Split Rules Preview Panel */}
                <div className="rounded-2xl p-5 bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <SlidersHorizontal className="w-4 h-4 text-brand-400" />
                      <h3 className="font-bold text-sm text-zinc-100">House Split Rules</h3>
                    </div>
                    <p className="text-xs text-zinc-400 mb-4">
                      Rent is split <strong className="text-zinc-200">50% Admin / 25% Couple each</strong>.
                      Utilities are split <strong className="text-zinc-200">33.3% each</strong>.
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab('rules')}
                    className="w-full py-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-700/60 transition-colors"
                  >
                    Manage Split Presets
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bills' && (
          <BillList onOpenPaymentInfo={() => setIsPaymentInfoOpen(true)} />
        )}

        {activeTab === 'rules' && <SplitRulesManager />}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-full py-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-bold text-sm hover:border-zinc-700"
            >
              Open Household & API Settings Modal
            </button>
          </div>
        )}

      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenScanner={() => setIsScannerOpen(true)}
      />

      {/* Modals */}
      <BillScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />

      <HouseholdSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <PaymentInfoModal
        isOpen={isPaymentInfoOpen}
        onClose={() => setIsPaymentInfoOpen(false)}
      />

      <RoommateManagerModal
        isOpen={isRoommatesOpen}
        onClose={() => setIsRoommatesOpen(false)}
      />

      <JoinHouseModal
        isOpen={isJoinHouseOpen}
        onClose={() => setIsJoinHouseOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <HouseholdProvider>
      <MainAppContent />
    </HouseholdProvider>
  );
};

export default App;
