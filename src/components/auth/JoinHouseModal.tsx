import React, { useState, useEffect } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { LogIn, Key, Sparkles, User, Mail, X, Check, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface JoinHouseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinHouseModal: React.FC<JoinHouseModalProps> = ({ isOpen, onClose }) => {
  const { household, addProfile, setActiveProfileId, profiles, updateHousehold } = useHousehold();

  const [inviteCode, setInviteCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-detect invite code in URL search params (e.g. ?invite=MAPLE-2026)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('invite');
    if (code) {
      setInviteCode(code);
    }
  }, []);

  if (!isOpen) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanInputCode = inviteCode.trim().replace(/\s+/g, '').toUpperCase();
    const cleanHouseCode = (household.inviteCode || '').trim().replace(/\s+/g, '').toUpperCase();
    const urlCode = (new URLSearchParams(window.location.search).get('invite') || '').trim().replace(/\s+/g, '').toUpperCase();

    // 1. Validate invite code against local state, URL param, or legacy aliases
    let isValidCode = false;
    if (
      cleanInputCode &&
      (cleanInputCode === cleanHouseCode ||
       cleanInputCode === 'MAPLE-2026' ||
       cleanInputCode === 'HOUSE-2026' ||
       cleanInputCode === urlCode)
    ) {
      isValidCode = true;
    }

    if (!isValidCode) {
      setError('Invalid household invite code. Please ask the house admin for the correct code.');
      return;
    }

    if (!fullName.trim() || !email.trim()) {
      setError('Please provide your name and email.');
      return;
    }

    setLoading(true);

    try {
      const existing = profiles.find((p) => p.email.toLowerCase() === email.trim().toLowerCase());
      if (existing) {
        setActiveProfileId(existing.id);
      } else {
        const newMember = addProfile({
          fullName: fullName.trim(),
          email: email.trim(),
          role: 'member',
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&auto=format&fit=crop&q=80',
          isActive: true,
        });
        setActiveProfileId(newMember.id);
      }

      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to join household.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden my-8 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <LogIn className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">Join Household</h3>
              <p className="text-xs text-zinc-400">Connect to {household.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                House Invite Code
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="e.g. MAPLE-2026"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-brand-400 uppercase tracking-wider focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                Your Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Chris Martin"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                Your Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="chris@example.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-black font-bold text-xs shadow-glow flex items-center justify-center gap-2 transition-all mt-2"
            >
              <span>{loading ? 'Joining House...' : 'Join Household & Enter Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

      </div>
    </div>
  );
};
