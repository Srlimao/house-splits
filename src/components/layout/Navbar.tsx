import React from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { Sparkles, Shield, User, Settings as SettingsIcon, Users, LogIn, LogOut } from 'lucide-react';
import { getStoredGeminiKey } from '../../lib/gemini';

interface NavbarProps {
  onOpenSettings: () => void;
  onOpenScanner: () => void;
  onOpenRoommates: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSettings,
  onOpenScanner,
  onOpenRoommates,
}) => {
  const { household, profiles, activeProfile, setActiveProfileId, currentUser, logout } = useHousehold();
  const hasGeminiKey = Boolean(getStoredGeminiKey());

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-[#09090b]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Household Name */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-glow text-xl font-black text-black">
            🏠
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-tight">HouseSplits</h1>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                PWA
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium">{household.name}</p>
          </div>
        </div>

        {/* Actions & Profile Perspective Switcher */}
        <div className="flex items-center gap-3">

          {/* Gemini AI Status Pill */}
          <button
            onClick={onOpenSettings}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              hasGeminiKey
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/50'
                : 'bg-amber-950/40 text-amber-300 border-amber-500/30 hover:bg-amber-900/50'
            }`}
            title="Configure your Google Gemini API Key"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>{hasGeminiKey ? 'Gemini 2.5 Active' : 'Add Gemini Key'}</span>
          </button>

          {/* Quick Scan Button (Desktop) */}
          {activeProfile.role === 'admin' && (
            <button
              onClick={onOpenScanner}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-black font-semibold text-xs transition-all shadow-glow hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Scan Bill</span>
            </button>
          )}

          {/* Active Profile Switcher Dropdown (Allows testing Admin vs Roommate perspective) */}
          <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-xl px-2.5 py-1.5">
            <div className="relative">
              {activeProfile.avatarUrl ? (
                <img
                  src={activeProfile.avatarUrl}
                  alt={activeProfile.fullName}
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-zinc-700"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300">
                  <User className="w-4 h-4" />
                </div>
              )}
              {activeProfile.role === 'admin' && (
                <span className="absolute -bottom-1 -right-1 bg-amber-500 text-black rounded-full p-0.5" title="House Admin">
                  <Shield className="w-2.5 h-2.5" />
                </span>
              )}
            </div>

            <div className="text-left">
              <span className="block text-[10px] text-zinc-400 uppercase font-semibold leading-none">
                {currentUser?.role === 'admin' ? 'Viewing as:' : 'Logged in as:'}
              </span>
              {currentUser?.role === 'admin' ? (
                <select
                  value={activeProfile.id}
                  onChange={(e) => setActiveProfileId(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-zinc-200 focus:outline-none cursor-pointer pr-1"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id} className="bg-zinc-900 text-zinc-200">
                      {p.fullName} {p.role === 'admin' ? '(Admin)' : '(Roommate)'}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-semibold text-zinc-200 block truncate max-w-[130px]">
                  {activeProfile.fullName}
                </span>
              )}
            </div>
          </div>

          {/* Roommates Trigger */}
          <button
            onClick={onOpenRoommates}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/60 transition-colors relative"
            title="Manage Roommates & Invite Code"
          >
            <Users className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 bg-brand-500 text-black text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
              {profiles.length}
            </span>
          </button>

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/60 transition-colors"
            title="Settings & Payment Details"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>

          {/* Log Out Button */}
          <button
            onClick={() => logout()}
            className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-500/30 transition-colors"
            title={currentUser?.email ? `Logged in as ${currentUser.email}. Click to log out.` : 'Log Out'}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

      </div>
    </header>
  );
};
