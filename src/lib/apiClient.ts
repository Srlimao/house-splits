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

export interface UploadFileResult {
  url: string;
  key: string;
  fileName: string;
  fileType: string;
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
      if (data.token) {
        localStorage.setItem('housesplits_token', data.token);
      }
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
      if (data.token) {
        localStorage.setItem('housesplits_token', data.token);
      }
      return data;
    },

    async getSession(): Promise<UserSession | null> {
      try {
        const token = localStorage.getItem('housesplits_token');
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch('/api/auth/session', { headers });
        if (!res.ok) {
          localStorage.removeItem('housesplits_token');
          return null;
        }
        const data = await res.json();
        if (!data.user) {
          localStorage.removeItem('housesplits_token');
          return null;
        }
        return data.user;
      } catch {
        localStorage.removeItem('housesplits_token');
        return null;
      }
    },

    async logout(): Promise<void> {
      localStorage.removeItem('housesplits_token');
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

  categories: {
    async getAll(householdId?: string): Promise<any[]> {
      const url = householdId ? `/api/categories?household_id=${householdId}` : '/api/categories';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load categories');
      return res.json();
    },
  },

  profiles: {
    async getAll(householdId?: string): Promise<any[]> {
      const url = householdId ? `/api/profiles?household_id=${householdId}` : '/api/profiles';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load profiles');
      return res.json();
    },

    async create(data: any): Promise<any> {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create profile');
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

  async uploadFile(file: File): Promise<UploadFileResult> {
    // 1. Try Cloudflare Pages /api/upload (if Cloudflare R2 bucket is bound)
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          return {
            url: data.url,
            key: data.key || file.name,
            fileName: data.fileName || file.name,
            fileType: data.fileType || file.type || 'application/octet-stream',
          };
        }
      }
    } catch {
      // Continue to Cloudflare D1 Data URL storage
    }

    // 2. Cloudflare D1 Native Storage: Convert file to Base64 Data URL
    // For images, optimize dimensions to keep D1 rows fast and lightweight
    if (file.type.startsWith('image/')) {
      try {
        const optimizedDataUrl = await new Promise<string>((resolve, reject) => {
          const img = new Image();
          const objectUrl = URL.createObjectURL(file);
          img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const MAX_DIM = 1600;
            let { width, height } = img;
            if (width > MAX_DIM || height > MAX_DIM) {
              if (width > height) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              } else {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve('');
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85);
            resolve(dataUrl);
          };
          img.onerror = reject;
          img.src = objectUrl;
        });

        if (optimizedDataUrl) {
          return {
            url: optimizedDataUrl,
            key: file.name,
            fileName: file.name,
            fileType: file.type || 'image/jpeg',
          };
        }
      } catch {
        // Fallback to raw FileReader if canvas optimization fails
      }
    }

    // PDF or raw file Data URL for Cloudflare D1 persistence
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          url: reader.result as string,
          key: file.name,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },
};
