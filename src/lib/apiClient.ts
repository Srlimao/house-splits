// HouseSplits Unified API Client (Cloudflare Pages Functions + D1 + R2)

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'member' | 'system_manager';
  isSystemManager: boolean;
  householdId?: string | null;
  avatarUrl?: string;
}

export const apiClient = {
  auth: {
    async login(email: string, password: string): Promise<{ user: UserSession; token: string }> {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      return data;
    },

    async signup(fullName: string, email: string, password: string, inviteCode: string): Promise<{ user: UserSession; token: string }> {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password, inviteCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sign up failed');
      return data;
    },

    async getSession(): Promise<UserSession | null> {
      try {
        const res = await fetch('/api/auth/session');
        if (!res.ok) return null;
        const data = await res.json();
        return data.user || null;
      } catch {
        return null;
      }
    },

    async logout(): Promise<void> {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {
        // ignore
      }
    },
  },

  households: {
    async getAll(): Promise<any[]> {
      const res = await fetch('/api/households');
      if (!res.ok) throw new Error('Failed to load households');
      return res.json();
    },

    async create(data: { name: string; currency?: string; invite_code?: string }): Promise<any> {
      const res = await fetch('/api/households', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to create household');
      return resData;
    },

    async update(id: string, updates: any): Promise<void> {
      const res = await fetch(`/api/households/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update household');
    },

    async delete(id: string): Promise<void> {
      const res = await fetch(`/api/households/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete household');
    },
  },

  profiles: {
    async getAll(householdId?: string): Promise<any[]> {
      const url = householdId ? `/api/profiles?household_id=${householdId}` : '/api/profiles';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load profiles');
      return res.json();
    },

    async update(id: string, updates: any): Promise<void> {
      const res = await fetch(`/api/profiles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update profile');
    },

    async delete(id: string): Promise<void> {
      const res = await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete profile');
    },
  },

  bills: {
    async getAll(householdId?: string): Promise<any[]> {
      const url = householdId ? `/api/bills?household_id=${householdId}` : '/api/bills';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load bills');
      return res.json();
    },

    async create(bill: any): Promise<any> {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bill),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create bill');
      return data;
    },

    async update(id: string, updates: any): Promise<void> {
      const res = await fetch(`/api/bills/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update bill');
    },

    async delete(id: string): Promise<void> {
      const res = await fetch(`/api/bills/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete bill');
    },
  },

  async uploadFile(file: File): Promise<{ url: string; key: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },
};
