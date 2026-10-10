import { supabase, isSupabaseConfigured } from './supabase';
import { User, Session } from '@supabase/supabase-js';

export interface AuthUserInfo {
  id: string;
  email: string;
  fullName?: string;
}

export const isAuthEnabled = (): boolean => isSupabaseConfigured() && Boolean(supabase);

export const signInWithEmailPassword = async (email: string, password: string): Promise<User> => {
  if (!supabase) throw new Error('Supabase is not configured.');
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw error;
  if (!data.user) throw new Error('No user returned from login.');
  return data.user;
};

export const signUpWithEmailPassword = async (
  email: string,
  password: string,
  fullName: string,
  householdId: string
): Promise<User> => {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        household_id: householdId,
      },
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error('Sign up failed. Please try again.');
  return data.user;
};

export const signOutUser = async (): Promise<void> => {
  if (supabase) {
    await supabase.auth.signOut();
  }
};

export const getAuthSession = async (): Promise<Session | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
};

export const onAuthChange = (callback: (session: Session | null) => void) => {
  if (!supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => subscription.unsubscribe();
};
