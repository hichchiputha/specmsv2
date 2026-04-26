import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../utils/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      expiresAt: null,

      login: async ({ email, password }) => {
        set({ isLoading: true });
        try {
          // window.electron may not exist in web/test environments
          let deviceId = 'web-fallback';
          let platform = 'web';
          let deviceName = 'Web Browser';

          if (window.electron) {
            const info = await window.electron.getAppInfo();
            deviceId = info.deviceId;
            platform = info.platform;
            deviceName = `${info.platform} - LMS App`;
          }

          const response = await api.post('/auth/login', {
            email, password, deviceId, platform, deviceName,
          });

          const { token, user, expiresAt } = response.data;
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          set({ token, user, isAuthenticated: true, isLoading: false, expiresAt });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return {
            success: false,
            error: error.response?.data?.error || error.message || 'Login failed',
          };
        }
      },

      register: async ({ email, password, firstName, lastName, phone }) => {
        set({ isLoading: true });
        try {
          let deviceId = `web-${Math.random().toString(36).slice(2)}`;
          let platform = 'web';

          if (window.electron) {
            const info = await window.electron.getAppInfo();
            deviceId = info.deviceId;
            platform = info.platform;
          }

          const response = await api.post('/auth/register', {
            email, password, firstName, lastName, phone,
            deviceId, platform,
          });

          const { token, user } = response.data;
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          set({ token, user, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return {
            success: false,
            error: error.response?.data?.error || error.message || 'Registration failed',
          };
        }
      },

      logout: async () => {
        try { await api.post('/auth/logout'); } catch (e) {}
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, token: null, isAuthenticated: false, expiresAt: null });
      },

      validateSession: async () => {
        const { token, expiresAt } = get();
        if (!token) { set({ isAuthenticated: false }); return false; }

        // Local expiry check
        if (expiresAt && new Date(expiresAt) < new Date()) {
          set({ user: null, token: null, isAuthenticated: false, expiresAt: null });
          return false;
        }

        try {
          // Always restore the header — it's lost on page reload
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await api.get('/auth/me');
          set({ user: response.data, isAuthenticated: true });
          return true;
        } catch (error) {
          delete api.defaults.headers.common['Authorization'];
          set({ user: null, token: null, isAuthenticated: false, expiresAt: null });
          return false;
        }
      },

      updateUser: (userData) => {
        set((state) => ({ user: { ...state.user, ...userData } }));
      },
    }),
    {
      name: 'lms-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        expiresAt: state.expiresAt,
      }),
      // Restore Authorization header immediately when store rehydrates from localStorage
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      },
    }
  )
);
