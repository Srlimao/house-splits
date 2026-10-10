import React, { useState } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import {
  Users,
  X,
  Copy,
  Check,
  Plus,
  Trash2,
  Shield,
  User,
  Share2,
  RefreshCw,
  Sparkles,
  Mail,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface RoommateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoommateManagerModal: React.FC<RoommateManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    household,
    profiles,
    activeProfile,
    addProfile,
    removeProfile,
    regenerateInviteCode,
  } = useHousehold();

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // New roommate form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'member' | 'admin'>('member');

  if (!isOpen) return null;

  const isAdmin = activeProfile.role === 'admin';
  const inviteCode = household.inviteCode || 'MAPLE-2026';
  const inviteUrl = `${window.location.origin}/?invite=${inviteCode}`;

  const shareText = `Hey! Join our household "${household.name}" on HouseSplits to track rent, utility bills, and payments: ${inviteUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyShareMsg = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  const handleAddRoommate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    // Pick a clean random avatar
    const avatarSeeds = ['1534528741775-53994a69daeb', '1507003211169-0a1dd7228f2d', '1494790108377-be9c29b29330', '1500648767791-00dcc994a43e', '1438761681033-6461ffad8d80'];
    const randomSeed = avatarSeeds[profiles.length % avatarSeeds.length];
    const avatarUrl = `https://images.unsplash.com/photo-${randomSeed}?w=128&auto=format&fit=crop&q=80`;

    addProfile({
      fullName: newName.trim(),
      email: newEmail.trim() || `${newName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      role: newRole,
      avatarUrl,
      isActive: true,
    });

    setNewName('');
    setNewEmail('');
    setIsAdding(false);
    confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden my-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-white">Household Roommates</h3>
              <p className="text-xs text-zinc-400">
                Manage members of {household.name} ({profiles.length} people)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invite Code & Share Card */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border border-brand-500/20 relative overflow-hidden space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5" />
              <span>Roommate Invite Link & Code</span>
            </span>
            {isAdmin && (
              <button
                onClick={() => regenerateInviteCode()}
                className="text-zinc-500 hover:text-zinc-300 text-xs flex items-center gap-1"
                title="Regenerate code"
              >
                <RefreshCw className="w-3 h-3" />
                <span>New Code</span>
              </button>
            )}
          </div>

          <p className="text-xs text-zinc-400">
            Send this invite code or link to your housemates so they can join your household on their phones.
          </p>

          <div className="flex items-center gap-2">
            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-300 truncate">
              {inviteUrl}
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <button
            onClick={handleCopyShareMsg}
            className="w-full py-2 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            {copiedMsg ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span>{copiedMsg ? 'Message Copied for WhatsApp / Chat!' : 'Copy WhatsApp / Group Chat Invite Message'}</span>
          </button>
        </div>

        {/* Roommates Directory */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Active Housemates ({profiles.length})
            </span>
            {isAdmin && !isAdding && (
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-1 text-xs font-bold text-brand-400 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Roommate Directly</span>
              </button>
            )}
          </div>

          {/* Add Roommate Inline Form */}
          {isAdding && (
            <form onSubmit={handleAddRoommate} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200">New Roommate Details</span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Jordan Lee"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="jordan@example.com"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      checked={newRole === 'member'}
                      onChange={() => setNewRole('member')}
                      className="accent-brand-500"
                    />
                    <span>Roommate (Member)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      checked={newRole === 'admin'}
                      onChange={() => setNewRole('admin')}
                      className="accent-brand-500"
                    />
                    <span>Co-Admin</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-black font-bold text-xs shadow-glow transition-colors"
                >
                  Save Roommate
                </button>
              </div>
            </form>
          )}

          {/* Members List */}
          <div className="space-y-2">
            {profiles.map((p) => {
              const isCurrent = p.id === activeProfile.id;
              const isHouseAdmin = p.role === 'admin';

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={p.avatarUrl}
                        alt={p.fullName}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-zinc-700"
                      />
                      {isHouseAdmin && (
                        <span className="absolute -bottom-1 -right-1 bg-amber-500 text-black rounded-full p-0.5" title="Admin">
                          <Shield className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-100">{p.fullName}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 font-semibold text-[10px]">
                            You
                          </span>
                        )}
                      </div>
                      <span className="text-zinc-500 text-[11px] block">{p.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-medium text-[11px] capitalize">
                      {p.role}
                    </span>

                    {isAdmin && p.id !== activeProfile.id && (
                      <button
                        onClick={() => removeProfile(p.id)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition-colors"
                        title="Remove roommate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Supabase Auth Explanation Banner */}
        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-start gap-2.5 text-xs text-zinc-400">
          <Info className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-zinc-200">How Login & Roommate Accounts Work:</p>
            <p className="leading-relaxed">
              When using <strong>Supabase</strong> in production, roommates open your invite link on their phones, click <strong>"Sign in with Google / Magic Link"</strong>, and enter your household code. Their user account is automatically bound to your house with Member access.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
