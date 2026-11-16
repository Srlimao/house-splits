import React, { useState, useEffect } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import {
  signInWithEmailPassword,
  signUpWithEmailPassword,
  isAuthEnabled,
} from '../../lib/authService';
import { DEFAULT_AVATAR_URL } from '../../context/householdStorageAndNormalizers';
import confetti from 'canvas-confetti';

export function useAuthScreenForm() {
  const { household, addProfile, setActiveProfileId, profiles } = useHousehold();

  const urlInviteCode = new URLSearchParams(window.location.search).get('invite');
  const [mode, setMode] = useState<'login' | 'join'>(urlInviteCode ? 'join' : 'login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState(urlInviteCode || household.inviteCode || 'MAPLE-2026');
  const [showPassword, setShowPassword] = useState(false);

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
        if (isAuthEnabled()) {
          const user = await signInWithEmailPassword(email, password);
          const existing = profiles.find(
            (p) => p.email.toLowerCase() === email.trim().toLowerCase() || p.id === user.id
          );
          if (existing) {
            setActiveProfileId(existing.id);
          } else if (user?.id) {
            setActiveProfileId(user.id);
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

        const codeToPass = cleanInputCode || cleanHouseCode || urlCode || household.id;

        if (isAuthEnabled()) {
          const user = await signUpWithEmailPassword(email, password, fullName, codeToPass);
          if (user?.id) {
            setActiveProfileId(user.id);
          }
        } else {
          const newMember = addProfile({
            fullName: fullName.trim(),
            email: email.trim(),
            role: 'member',
            avatarUrl: DEFAULT_AVATAR_URL,
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

  return {
    household,
    urlInviteCode,
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    fullName,
    setFullName,
    inviteCode,
    setInviteCode,
    showPassword,
    setShowPassword,
    error,
    setError,
    loading,
    handleSubmit,
  };
}
