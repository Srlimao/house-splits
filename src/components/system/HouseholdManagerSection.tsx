import React, { useState } from 'react';
import {
  Home,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Users,
  Calendar,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';

export interface DbHousehold {
  id: string;
  name: string;
  currency: string;
  invite_code: string;
  created_at: string;
  member_count?: number;
}

interface HouseholdManagerSectionProps {
  households: DbHousehold[];
  onRefresh: () => void;
  onSelectHousehold: (householdId: string) => void;
  selectedHouseholdId?: string | null;
}

export const HouseholdManagerSection: React.FC<HouseholdManagerSectionProps> = ({
  households,
  onRefresh,
  onSelectHousehold,
  selectedHouseholdId,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCopyLink = (code: string, id: string) => {
    const url = `${window.location.origin}/?invite=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteHousehold = async (h: DbHousehold) => {
    const confirmName = window.prompt(
      `CAUTION: Deleting "${h.name}" will permanently erase all its bills, split rules, and decouple its members.\n\nTo confirm, type the household name below:`
    );

    if (confirmName !== h.name) {
      if (confirmName !== null) {
        alert('Household name did not match. Deletion cancelled.');
      }
      return;
    }

    setDeletingId(h.id);
    setError(null);

    try {
      await apiClient.households.delete(h.id);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete household';
      setError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {households.length === 0 ? (
        <div className="p-8 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800 text-zinc-500 text-sm">
          No households found. Click "+ New Household" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {households.map((h) => {
            const isSelected = selectedHouseholdId === h.id;
            const isDeleting = deletingId === h.id;

            return (
              <div
                key={h.id}
                className={`p-5 rounded-2xl bg-zinc-900 border transition-all ${
                  isSelected ? 'border-amber-500/60 bg-amber-950/10 shadow-lg shadow-amber-500/5' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-amber-400">
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-100 text-sm flex items-center gap-2">
                        {h.name}
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                            Active Preview
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                        <span>Currency: <strong className="text-zinc-400">{h.currency}</strong></span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-zinc-400" />
                          {h.member_count ?? 0} members
                        </span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteHousehold(h)}
                    disabled={isDeleting}
                    className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors border border-transparent hover:border-rose-500/20 disabled:opacity-50"
                    title={`Delete ${h.name}`}
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin text-rose-400" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>

                {/* Invite Code Row */}
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between text-xs mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 text-[11px]">Invite Code:</span>
                    <span className="font-mono font-bold text-amber-400 tracking-wider">
                      {h.invite_code || 'NONE'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyLink(h.invite_code, h.id)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {copiedId === h.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Footer Action */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-xs">
                  <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {h.created_at ? new Date(h.created_at).toLocaleDateString() : 'N/A'}
                  </span>

                  <button
                    onClick={() => onSelectHousehold(h.id)}
                    className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-semibold text-xs transition-colors"
                  >
                    <span>{isSelected ? 'Viewing Bills & Data' : 'Inspect Household'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
