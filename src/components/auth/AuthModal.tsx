import React, { useState, useEffect } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { signInWithEmailPassword, signUpWithEmailPassword, isAuthEnabled } from '../../lib/authService';
import { LogIn, UserPlus, Key, Mail, Lock, User, Eye, EyeOff, X, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'join';
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
}) => {
  const { household, addProfile, setActiveProfileId, profiles, updateHousehold } = useHousehold();
  const [mode, setMode] = useState<'login' | 'join'>(initialMode);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // State
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode, isOpen]);

  // Pre-fill invite code from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('invite');
    if (code) {
      setInviteCode(code);
      setMode('join');
    } else if (household.inviteCode) {
      setInviteCode(household.inviteCode);
    }
  }, [household.inviteCode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        // Sign In Flow
        if (isAuthEnabled()) {
          const user = await signInWithEmailPassword(email, password);
          // Match profile by email or user id
          const existing = profiles.find(
            (p) => p.email.toLowerCase() === email.trim().toLowerCase() || p.id === user.id
          );
          if (existing) {
            setActiveProfileId(existing.id);
          } else {
            // Create local profile fallback
            const newMember = addProfile({
              fullName: user.user_metadata?.full_name || email.split('@')[0],
              email: email.trim(),
              role: 'member',
              avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&auto=format&fit=crop&q=80',
              isActive: true,
            });
            setActiveProfileId(newMember.id);
          }
        } else {
          // Local fallback
          const existing = profiles.find((p) => p.email.toLowerCase() === email.trim().toLowerCase());
          if (existing) {
            setActiveProfileId(existing.id);
          } else {
            setError('User not found. Please join with a household invite code first.');
            setLoading(false);
            return;
          }
        }

        confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
        onClose();
      } else {
        // Join Household Flow
        const cleanInputCode = inviteCode.trim().toUpperCase();
        const cleanHouseCode = (household.inviteCode || '').trim().toUpperCase();
        const urlCode = (new URLSearchParams(window.location.search).get('invite') || '').trim().toUpperCase();

        const isValidCode =
          cleanInputCode &&
          (cleanInputCode === cleanHouseCode ||
            cleanInputCode === 'MAPLE-2026' ||
            cleanInputCode === 'HOUSE-2026' ||
            cleanInputCode === urlCode);

        if (!isValidCode) {
          setError('Invalid household invite code. Please check with your house admin.');
          setLoading(false);
          return;
        }

        if (!fullName.trim()) {
          setError('Please provide your full name.');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }

        // Register in Supabase Auth (zero email limit via mailer_autoconfirm)
        if (isAuthEnabled()) {
          const user = await signUpWithEmailPassword(email, password, fullName, household.id);
          const newMember = addProfile({
            fullName: fullName.trim(),
            email: email.trim(),
            role: 'member',
            avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&auto=format&fit=crop&q=80',
            isActive: true,
          });
          setActiveProfileId(newMember.id);
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

        confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
        onClose();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden my-8 space-y-5">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </span>
            <div>
              <h3 className="text-base font-bold text-white">
                {mode === 'login' ? 'Sign In to HouseSplits' : `Join ${household.name}`}
              </h3>
              <p className="text-xs text-zinc-400">
                {mode === 'login' ? 'Access your bills and splits' : 'Create your roommate account'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'login' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('join'); setError(null); }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'join' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Join with Code
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {mode === 'join' && (
            <>
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
                    placeholder="e.g. Alex Morgan"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="roommate@example.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
              Password {mode === 'join' && <span className="text-zinc-500 lowercase">(min 6 chars)</span>}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-10 py-2 text-xs text-zinc-200 focus:outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-black font-bold text-xs shadow-glow flex items-center justify-center gap-2 transition-all mt-3"
          >
            {loading ? (
              <span>Processing...</span>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to Household</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Join & Create Account</span>
              </>
            )}
          </button>
        </form>

        {/* Footer switch prompt */}
        <div className="text-center pt-2">
          {mode === 'login' ? (
            <p className="text-xs text-zinc-400">
              New roommate?{' '}
              <button
                type="button"
                onClick={() => { setMode('join'); setError(null); }}
                className="text-brand-400 hover:underline font-semibold"
              >
                Join with an Invite Code
              </button>
            </p>
          ) : (
            <p className="text-xs text-zinc-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className="text-brand-400 hover:underline font-semibold"
              >
                Sign In
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
};
