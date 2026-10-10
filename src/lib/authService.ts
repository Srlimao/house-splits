import { apiClient, UserSession } from './apiClient';

export interface AuthUserInfo {
  id: string;
  email: string;
  fullName?: string;
}

export const isAuthEnabled = (): boolean => true;

export const signInWithEmailPassword = async (email: string, password: string): Promise<any> => {
  const res = await apiClient.auth.login(email.trim(), password);
  if (!res?.user) {
    throw new Error('Invalid email or password');
  }

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
};

export const signUpWithEmailPassword = async (
  email: string,
  password: string,
  fullName: string,
  inviteCodeOrHouseholdId: string
): Promise<any> => {
  const res = await apiClient.auth.signup(fullName.trim(), email.trim(), password, inviteCodeOrHouseholdId);
  if (!res?.user) {
    throw new Error('Sign up failed');
  }

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
};

export const signOutUser = async (): Promise<void> => {
  await apiClient.auth.logout();
  window.dispatchEvent(new CustomEvent('housesplits_auth_change', { detail: null }));
};

export const getAuthSession = async (): Promise<any> => {
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
  return null;
};

export const onAuthChange = (callback: (session: any) => void) => {
  const customHandler = (e: any) => {
    callback(e.detail);
  };
  window.addEventListener('housesplits_auth_change', customHandler);

  return () => {
    window.removeEventListener('housesplits_auth_change', customHandler);
  };
};
