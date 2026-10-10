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
      return {
        id: res.user.id,
        email: res.user.email,
        user_metadata: { full_name: res.user.fullName },
      };
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
      return {
        id: res.user.id,
        email: res.user.email,
        user_metadata: { full_name: res.user.fullName },
      };
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
          user_metadata: { full_name: user.fullName },
        },
      };
    }
  } catch {
    // ignore
  }

  // 2. Fallback to Supabase session if configured
  if (supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (!error && data.session) return data.session;
  }
  return null;
};

export const onAuthChange = (callback: (session: any) => void) => {
  if (supabase) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    return () => subscription.unsubscribe();
  }
  return () => {};
};
