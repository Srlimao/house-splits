import { supabase, isSupabaseConfigured } from './supabase';
import { apiClient } from './apiClient';

export interface AuthUserInfo {
  id: string;
  email: string;
  fullName?: string;
}

export const isAuthEnabled = (): boolean => true;

export const signInWithEmailPassword = async (email: string, password: string): Promise<any> => {
  // 1. Try Cloudflare Native /api/auth/login
  try {
    const res = await apiClient.auth.login(email, password);
    if (res?.user) {
      const userPayload = {
        id: res.user.id,
        email: res.user.email,
        role: res.user.role,
        isSystemManager: res.user.isSystemManager,
        householdId: res.user.householdId,
        user_metadata: { full_name: res.user.fullName },
      };
      window.dispatchEvent(new CustomEvent('housesplits_auth_change', { detail: { user: userPayload } }));
      return userPayload;
    }
  } catch (apiErr: any) {
    // If running with Supabase as fallback
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      if (!data.user) throw new Error('No user returned from login.');
      return data.user;
    }
    throw apiErr;
  }
};

export const signUpWithEmailPassword = async (
  email: string,
  password: string,
  fullName: string,
  inviteCodeOrHouseholdId: string
): Promise<any> => {
  // 1. Try Cloudflare Native /api/auth/signup
  try {
    const res = await apiClient.auth.signup(fullName, email, password, inviteCodeOrHouseholdId);
    if (res?.user) {
      const userPayload = {
        id: res.user.id,
        email: res.user.email,
        role: res.user.role,
        isSystemManager: res.user.isSystemManager,
        householdId: res.user.householdId,
        user_metadata: { full_name: res.user.fullName },
      };
      window.dispatchEvent(new CustomEvent('housesplits_auth_change', { detail: { user: userPayload } }));
      return userPayload;
    }
  } catch (apiErr: any) {
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            household_id: inviteCodeOrHouseholdId,
          },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error('Sign up failed.');
      return data.user;
    }
    throw apiErr;
  }
};

export const signOutUser = async (): Promise<void> => {
  await apiClient.auth.logout();
  window.dispatchEvent(new CustomEvent('housesplits_auth_change', { detail: null }));
  if (supabase) {
    await supabase.auth.signOut();
  }
};

export const getAuthSession = async (): Promise<any> => {
  // 1. Check Cloudflare Native session
  try {
    const user = await apiClient.auth.getSession();
    if (user) {
      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isSystemManager: user.isSystemManager,
          householdId: user.householdId,
          user_metadata: { full_name: user.fullName },
        },
      };
    }
  } catch {
    // ignore
  }

  // 2. Fallback to Supabase session if configured and no native token exists
  if (!localStorage.getItem('housesplits_token') && supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (!error && data.session) return data.session;
  }
  return null;
};

export const onAuthChange = (callback: (session: any) => void) => {
  const customHandler = (e: any) => {
    callback(e.detail);
  };
  window.addEventListener('housesplits_auth_change', customHandler);

  let sub: any = null;
  if (supabase) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // If a native session token exists, do NOT allow Supabase null session to overwrite it
      if (!session && localStorage.getItem('housesplits_token')) {
        return;
      }
      callback(session);
    });
    sub = subscription;
  }

  return () => {
    window.removeEventListener('housesplits_auth_change', customHandler);
    if (sub) sub.unsubscribe();
  };
};
