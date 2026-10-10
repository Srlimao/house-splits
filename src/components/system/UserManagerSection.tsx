import React, { useState } from 'react';
import {
  Users,
  Search,
  Shield,
  Trash2,
  Check,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { DbHousehold } from './HouseholdManagerSection';
import { UserRole } from '../../types';

export interface DbProfile {
  id: string;
  household_id: string | null;
  full_name: string;
  email: string;
  role: UserRole;
  is_system_manager?: boolean;
  avatar_url?: string;
  is_active?: boolean;
  created_at?: string;
}

interface UserManagerSectionProps {
  profiles: DbProfile[];
  households: DbHousehold[];
  onRefresh: () => void;
  currentUserId?: string;
}

export const UserManagerSection: React.FC<UserManagerSectionProps> = ({
  profiles,
  households,
  onRefresh,
  currentUserId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHouseFilter, setSelectedHouseFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleRoleChange = async (profileId: string, newRole: UserRole) => {
    setUpdatingId(profileId);
    setError(null);

    try {
      const isSys = newRole === 'system_manager';
      const updates: any = { role: newRole, is_system_manager: isSys };
      if (isSys) {
        updates.household_id = null;
      }

      await apiClient.profiles.update(profileId, updates);

      showNotification(`Updated role to ${newRole}${isSys ? ' (unbound from household)' : ''}`);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update role';
      setError(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleHouseholdChange = async (profileId: string, newHouseId: string) => {
    const targetUser = profiles.find((p) => p.id === profileId);
    if (targetUser?.role === 'system_manager' || targetUser?.is_system_manager) {
      setError('System managers are global and cannot be bound to any household.');
      return;
    }

    setUpdatingId(profileId);
    setError(null);

    try {
      const targetHouseId = newHouseId === 'none' ? null : newHouseId;
      const updates = { household_id: targetHouseId };

      await apiClient.profiles.update(profileId, updates);

      showNotification('Household reassigned');
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reassign household';
      setError(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (p: DbProfile) => {
    if (p.id === currentUserId) {
      alert('You cannot delete your own active manager account.');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete "${p.full_name}" (${p.email})?`)) {
      return;
    }

    setDeletingId(p.id);
    setError(null);

    try {
      await apiClient.profiles.delete(p.id);
      showNotification(`Removed user ${p.full_name}`);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user';
      setError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = profiles.filter((p) => {
    const matchesSearch =
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesHouse =
      selectedHouseFilter === 'all' ||
      (selectedHouseFilter === 'none' && !p.household_id) ||
      p.household_id === selectedHouseFilter;
    return matchesSearch && matchesHouse;
  });

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users by name or email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={selectedHouseFilter}
          onChange={(e) => setSelectedHouseFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-amber-500"
        >
          <option value="all">All Households ({households.length})</option>
          <option value="none">Unassigned / Global</option>
          {households.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/70 border-b border-zinc-800 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Household</th>
                <th className="py-3 px-4">Role / Type</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-500">
                    No users match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isUpdating = updatingId === p.id;
                  const isDeleting = deletingId === p.id;
                  const isSelf = p.id === currentUserId;
                  const isSysManager = p.role === 'system_manager' || p.is_system_manager;

                  return (
                    <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&auto=format&fit=crop&q=80'}
                            alt={p.full_name}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-zinc-700"
                          />
                          <div>
                            <div className="flex items-center gap-1.5 font-semibold text-zinc-100">
                              <span>{p.full_name}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-zinc-500 text-[11px] block">{p.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {isSysManager ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold text-[11px]">
                            <Shield className="w-3 h-3" />
                            Global (Not bound to household)
                          </span>
                        ) : (
                          <select
                            value={p.household_id || 'none'}
                            onChange={(e) => handleHouseholdChange(p.id, e.target.value)}
                            disabled={isUpdating}
                            className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs focus:outline-none focus:border-amber-500"
                          >
                            <option value="none">-- Unassigned --</option>
                            {households.map((h) => (
                              <option key={h.id} value={h.id}>
                                {h.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={p.role}
                            onChange={(e) => handleRoleChange(p.id, e.target.value as UserRole)}
                            disabled={isUpdating || isSelf}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold capitalize focus:outline-none ${
                              isSysManager
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                : p.role === 'admin'
                                ? 'bg-brand-500/10 border-brand-500/30 text-brand-400'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                            }`}
                          >
                            <option value="member">Member</option>
                            <option value="admin">House Admin</option>
                            <option value="system_manager">System Manager</option>
                          </select>
                          {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {!isSelf && (
                          <button
                            onClick={() => handleDeleteUser(p)}
                            disabled={isDeleting}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors border border-transparent hover:border-rose-500/20 disabled:opacity-50"
                            title={`Delete user ${p.full_name}`}
                          >
                            {isDeleting ? (
                              <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
