import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../utils/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async ({ email, password }) => {
        // Use admin-specific login — web panel sends both tokens
        const r = await api.post('/auth/login', {
          email,
          password,
          deviceId: 'web-admin-panel',
          platform: 'web',
          deviceName: 'Web Admin Panel',
        });
        const { token, user } = r.data;

        if (!['admin', 'teacher'].includes(user.role)) {
          throw new Error('Access denied: Only admins and teachers can access this panel');
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        set({ token, user, isAuthenticated: true });
        return { token, user };
      },

      logout: async () => {
        try { await api.post('/auth/logout'); } catch (e) {}
        delete api.defaults.headers.common['Authorization'];
        set({ token: null, user: null, isAuthenticated: false });
      },

      validateSession: async () => {
        const { token } = get();
        if (!token) { set({ isAuthenticated: false }); return false; }
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const r = await api.get('/auth/me');
          if (!['admin', 'teacher'].includes(r.data.role)) {
            throw new Error('Access denied');
          }
          set({ user: r.data, isAuthenticated: true });
          return true;
        } catch (e) {
          delete api.defaults.headers.common['Authorization'];
          set({ token: null, user: null, isAuthenticated: false });
          return false;
        }
      },
    }),
    {
      name: 'lms-web-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ token: s.token, user: s.user, isAuthenticated: s.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        // Restore auth header after page reload
        if (state?.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      },
    }
  )
);
