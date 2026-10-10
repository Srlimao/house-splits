import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Home,
  Users,
  Plus,
  RefreshCw,
  LogOut,
  Building2,
  CheckCircle2,
  Sliders,
  ArrowLeft,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { apiClient } from '../../lib/apiClient';
import { useHousehold } from '../../context/HouseholdContext';
import { HouseholdManagerSection, DbHousehold } from './HouseholdManagerSection';
import { UserManagerSection, DbProfile } from './UserManagerSection';
import { CreateHouseholdModal } from './CreateHouseholdModal';

interface SystemManagerPortalProps {
  onInspectHousehold?: (householdId: string) => void;
}

export const SystemManagerPortal: React.FC<SystemManagerPortalProps> = ({
  onInspectHousehold,
}) => {
  const { currentUser, logout } = useHousehold();
  const [activeTab, setActiveTab] = useState<'households' | 'users'>('households');
  const [households, setHouseholds] = useState<DbHousehold[]>([]);
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let fetchedHouseholds: DbHousehold[] = [];
      let fetchedProfiles: DbProfile[] = [];

      try {
        const [hData, pData] = await Promise.all([
          apiClient.households.getAll(),
          apiClient.profiles.getAll(),
        ]);
        fetchedHouseholds = hData;
        fetchedProfiles = pData.map((p: any) => ({
          id: p.id,
          household_id: p.householdId ?? p.household_id ?? null,
          full_name: p.fullName || p.full_name || 'User',
          email: p.email || '',
          role: p.role || 'member',
          is_system_manager: Boolean(p.isSystemManager ?? p.is_system_manager),
          avatar_url: p.avatarUrl || p.avatar_url,
          is_active: p.isActive ?? p.is_active ?? true,
          created_at: p.createdAt || p.created_at,
        }));
      } catch {
        if (supabase) {
          const [hRes, pRes] = await Promise.all([
            supabase.from('households').select('*').order('created_at', { ascending: false }),
            supabase.from('profiles').select('*').order('created_at', { ascending: false }),
          ]);
          fetchedHouseholds = hRes.data || [];
          fetchedProfiles = pRes.data || [];
        }
      }

      // Calculate member counts per household (EXCLUDING system managers)
      const countMap: Record<string, number> = {};
      fetchedProfiles.forEach((p) => {
        if (p.household_id && p.role !== 'system_manager' && !p.is_system_manager) {
          countMap[p.household_id] = (countMap[p.household_id] || 0) + 1;
        }
      });

      const withCounts = fetchedHouseholds.map((h) => ({
        ...h,
        member_count: countMap[h.id] || 0,
      }));

      setHouseholds(withCounts);
      setProfiles(fetchedProfiles);
    } catch (err) {
      console.error('Error loading system manager data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectHousehold = (id: string) => {
    setSelectedHouseId(id);
    if (onInspectHousehold) {
      onInspectHousehold(id);
    }
  };

  const totalHouseholds = households.length;
  const totalUsers = profiles.length;
  const totalAdmins = profiles.filter((p) => p.role === 'admin' || p.role === 'system_manager').length;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-300 flex items-center justify-center text-zinc-950 font-black text-lg shadow-lg shadow-amber-500/10">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-tight text-white">HouseSplits</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> System Manager
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Global Administration & Tenant Control</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Refresh system data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/10 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Household</span>
          </button>

          <div className="h-5 w-px bg-zinc-800 mx-1" />

          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-500/30 text-zinc-400 hover:text-rose-400 text-xs font-semibold transition-colors"
            title={`Logged in as ${currentUser?.email || 'manager'}. Click to log out.`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Households</p>
              <p className="text-2xl font-black text-white mt-1">{totalHouseholds}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Active home split groups</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Registered Users</p>
              <p className="text-2xl font-black text-white mt-1">{totalUsers}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Across all tenant households</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Administrators</p>
              <p className="text-2xl font-black text-white mt-1">{totalAdmins}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">House admins & managers</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          <button
            onClick={() => setActiveTab('households')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'households'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/10'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Households ({totalHouseholds})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'users'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/10'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users & User Types ({totalUsers})</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'households' ? (
          <HouseholdManagerSection
            households={households}
            onRefresh={fetchData}
            onSelectHousehold={handleSelectHousehold}
            selectedHouseholdId={selectedHouseId}
          />
        ) : (
          <UserManagerSection
            profiles={profiles}
            households={households}
            onRefresh={fetchData}
            currentUserId={currentUser?.id}
          />
        )}
      </main>

      {/* Create Household Modal */}
      <CreateHouseholdModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={fetchData}
      />
    </div>
  );
};
