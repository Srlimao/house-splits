import { useState, useEffect } from 'react';
import { Profile, UserRole } from '../types';
import { signOutUser, onAuthChange, getAuthSession } from '../lib/authService';
import { DEFAULT_AVATAR_URL } from './householdStorageAndNormalizers';

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
  isSystemManager?: boolean;
  householdId?: string | null;
  fullName?: string;
}

function mapSessionUser(sessionUser: any): AuthUser {
  const userEmail = sessionUser.email?.toLowerCase();
  const isSys = Boolean(
    sessionUser.isSystemManager ||
      sessionUser.role === 'system_manager' ||
      userEmail === 'manager@dunhas.com'
  );
  return {
    id: sessionUser.id,
    email: sessionUser.email || '',
    role: isSys ? 'system_manager' : sessionUser.role,
    isSystemManager: isSys,
    householdId: isSys ? null : sessionUser.householdId,
    fullName: sessionUser.fullName || sessionUser.user_metadata?.full_name,
  };
}

export function useAuthSessionState(profiles: Profile[], householdId: string) {
  const [activeProfileId, setActiveProfileId] = useState<string>('user-admin');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    getAuthSession()
      .then((session) => {
        if (!isMounted) return;
        if (session?.user) {
          setCurrentUser(mapSessionUser(session.user));
        }
      })
      .finally(() => {
        if (isMounted) setIsAuthLoading(false);
      });

    const unsubscribe = onAuthChange((session) => {
      if (!isMounted) return;
      if (session?.user) {
        setCurrentUser(mapSessionUser(session.user));
      } else {
        setCurrentUser(null);
      }
      setIsAuthLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUser || currentUser.isSystemManager) return;

    const match = profiles.find(
      (p) =>
        p.email.toLowerCase() === currentUser.email.toLowerCase() ||
        p.id === currentUser.id
    );
    const isValidSelection = profiles.some((p) => p.id === activeProfileId);

    if (currentUser.role === 'admin') {
      if ((!isValidSelection || activeProfileId === 'user-admin') && match) {
        setActiveProfileId(match.id);
      } else if (!isValidSelection && currentUser.id) {
        setActiveProfileId(currentUser.id);
      }
    } else if (match && activeProfileId !== match.id) {
      setActiveProfileId(match.id);
    } else if (!match && currentUser.id && activeProfileId !== currentUser.id) {
      setActiveProfileId(currentUser.id);
    }
  }, [currentUser, profiles]);

  const isSystemManager = Boolean(
    currentUser &&
      (currentUser.email?.toLowerCase() === 'manager@dunhas.com' ||
        currentUser.role === 'system_manager' ||
        currentUser.isSystemManager)
  );

  const managerProfile: Profile = {
    id: currentUser?.id || 'sys-manager',
    householdId: '',
    fullName: currentUser?.email === 'manager@dunhas.com' ? 'System Manager' : 'Admin',
    email: currentUser?.email || 'manager@dunhas.com',
    role: 'system_manager',
    isSystemManager: true,
    avatarUrl: DEFAULT_AVATAR_URL,
    isActive: true,
  };

  const currentUserFallbackProfile: Profile | null =
    currentUser && !isSystemManager
      ? {
          id: currentUser.id,
          householdId: currentUser.householdId || householdId,
          fullName: currentUser.fullName || currentUser.email.split('@')[0],
          email: currentUser.email,
          role: (currentUser.role as UserRole) || 'member',
          isSystemManager: false,
          avatarUrl: DEFAULT_AVATAR_URL,
          isActive: true,
        }
      : null;

  const userMatchedProfile = currentUser
    ? profiles.find(
        (p) =>
          p.email.toLowerCase() === currentUser.email.toLowerCase() ||
          p.id === currentUser.id
      )
    : undefined;

  const selectedProfile = profiles.find((p) => p.id === activeProfileId);

  const activeProfile: Profile = isSystemManager
    ? managerProfile
    : currentUser?.role === 'admin'
    ? selectedProfile ||
      userMatchedProfile ||
      currentUserFallbackProfile ||
      profiles.find((p) => p.role === 'admin') ||
      profiles[0] ||
      managerProfile
    : userMatchedProfile ||
      selectedProfile ||
      currentUserFallbackProfile ||
      profiles.find((p) => p.role === 'admin') ||
      profiles[0] ||
      managerProfile;

  const logout = async () => {
    await signOutUser();
    setCurrentUser(null);
    if (profiles.length > 0) {
      setActiveProfileId(profiles[0].id);
    }
  };

  return {
    currentUser,
    isAuthLoading,
    isSystemManager,
    activeProfile,
    setActiveProfileId,
    logout,
  };
}
