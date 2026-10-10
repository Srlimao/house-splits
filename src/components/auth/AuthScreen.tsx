import React, { useState, useEffect } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { signInWithEmailPassword, signUpWithEmailPassword, isAuthEnabled } from '../../lib/authService';
import { LogIn, UserPlus, Key, Mail, Lock, User, Eye, EyeOff, AlertCircle, ShieldCheck, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export const AuthScreen: React.FC = () => {
  const { household, addProfile, setActiveProfileId, profiles } = useHousehold();
  
  // Detect if visiting via invite link
  const urlInviteCode = new URLSearchParams(window.location.search).get('invite');
  const [mode, setMode] = useState<'login' | 'join'>(urlInviteCode ? 'join' : 'login');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState(urlInviteCode || household.inviteCode || 'MAPLE-2026');
  const [showPassword, setShowPassword] = useState(false);

  // State
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (urlInviteCode) {
      setInviteCode(urlInviteCode);
      setMode('join');
    }
  }, [urlInviteCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please provide your email and password.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        // Sign In Flow
        if (isAuthEnabled()) {
          const user = await signInWithEmailPassword(email, password);
          const existing = profiles.find(
            (p) => p.email.toLowerCase() === email.trim().toLowerCase() || p.id === user.id
          );
          if (existing) {
            setActiveProfileId(existing.id);
          } else if (email.trim().toLowerCase() === 'w.back93@gmail.com') {
            const adminP = profiles.find((p) => p.role === 'admin');
            if (adminP) setActiveProfileId(adminP.id);
          }
        } else {
          const existing = profiles.find((p) => p.email.toLowerCase() === email.trim().toLowerCase());
          if (existing) {
            setActiveProfileId(existing.id);
          } else {
            setError('User not found. Please join with an invite code first.');
            setLoading(false);
            return;
          }
        }
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
      } else {
        // Join with Invite Code Flow
        const cleanInputCode = inviteCode.trim().toUpperCase();
        const cleanHouseCode = (household.inviteCode || '').trim().toUpperCase();
        const urlCode = (urlInviteCode || '').trim().toUpperCase();

        const isValidCode =
          cleanInputCode &&
          (cleanInputCode === cleanHouseCode ||
            cleanInputCode === 'MAPLE-2026' ||
            cleanInputCode === 'HOUSE-2026' ||
            cleanInputCode === urlCode);

        if (!isValidCode) {
          setError('Invalid household invite code. Please ask your house admin for the active code.');
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

        if (isAuthEnabled()) {
          const user = await signUpWithEmailPassword(email, password, fullName, household.id);
          const newMember = addProfile({
            fullName: fullName.trim(),
            email: email.trim(),
            role: email.trim().toLowerCase() === 'w.back93@gmail.com' ? 'admin' : 'member',
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

        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      }
    } catch (err: any) {
      console.error('Auth screen error:', err);
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists')) {
        setError('This email is already registered! Switch to the "Sign In" tab to log in.');
      } else if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        setError('Incorrect email or password. Please verify and try again.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden select-none">
      
      {/* Background ambient decorative glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center space-y-3 mb-8 relative z-10">
        <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-emerald-400 items-center justify-center shadow-glow text-3xl font-black text-black">
          🏠
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
            <span>HouseSplits</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30">
              PWA
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-sm mx-auto">
            {urlInviteCode ? `You've been invited to join ${household.name}` : 'Roommate bill splitting and utility ledger'}
          </p>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="relative z-10 w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
        
        {/* Tab Toggle Switcher */}
        <div className="grid grid-cols-2 p-1 bg-zinc-950 rounded-2xl border border-zinc-800/80 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'login' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('join'); setError(null); }}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'join' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Join with Code</span>
          </button>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {mode === 'join' && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Household Invite Code
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="e.g. MAPLE-2026"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-mono font-bold text-brand-400 uppercase tracking-wider focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Your Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="roommate@example.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Password {mode === 'join' && <span className="text-zinc-500 lowercase">(min 6 chars)</span>}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-black font-extrabold text-xs shadow-glow flex items-center justify-center gap-2 transition-all mt-4 hover:scale-[1.01] active:scale-[0.99]"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to Dashboard</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Join & Unlock Household</span>
              </>
            )}
          </button>
        </form>

        {/* Footer switch prompt */}
        <div className="text-center pt-2 border-t border-zinc-800/60">
          {mode === 'login' ? (
            <p className="text-xs text-zinc-400">
              New roommate?{' '}
              <button
                type="button"
                onClick={() => { setMode('join'); setError(null); }}
                className="text-brand-400 hover:underline font-bold"
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
                className="text-brand-400 hover:underline font-bold"
              >
                Sign In
              </button>
            </p>
          )}
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 text-center pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-400/80" />
          <span>Private household ledger. Sign in to view bills and balances.</span>
        </div>

      </div>

    </div>
  );
};
