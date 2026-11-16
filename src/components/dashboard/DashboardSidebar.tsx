import React from 'react';
import { Profile } from '../../types';
import { DEFAULT_AVATAR_URL } from '../../context/householdStorageAndNormalizers';
import { Users, UserPlus, SlidersHorizontal } from 'lucide-react';

interface DashboardSidebarProps {
  profiles: Profile[];
  onOpenRoommates: () => void;
  onOpenRules: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  profiles,
  onOpenRoommates,
  onOpenRules,
}) => {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5 bg-zinc-900/40 border border-zinc-800/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-400" />
            <h3 className="font-bold text-sm text-zinc-100">Roommates ({profiles.length})</h3>
          </div>
          <button
            onClick={onOpenRoommates}
            className="text-xs text-brand-400 hover:underline font-semibold"
          >
            Invite / Code
          </button>
        </div>

        <div className="flex items-center -space-x-2 mb-4">
          {profiles.map((p) => (
            <img
              key={p.id}
              src={p.avatarUrl || DEFAULT_AVATAR_URL}
              alt={p.fullName}
              title={`${p.fullName} (${p.role})`}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-zinc-900"
            />
          ))}
        </div>

        <button
          onClick={onOpenRoommates}
          className="w-full py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-700/60 transition-colors flex items-center justify-center gap-1.5"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Manage &amp; Invite Roommates</span>
        </button>
      </div>

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
          onClick={onOpenRules}
          className="w-full py-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-700/60 transition-colors"
        >
          Manage Split Presets
        </button>
      </div>
    </div>
  );
};
