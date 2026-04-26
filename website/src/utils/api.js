import axios from 'axios';

const APP_TOKEN = import.meta.env.VITE_APP_TOKEN || 'lms-electron-app-token-v1';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || 'lms-admin-panel-secret-key-change-this';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type':  'application/json',
    'x-app-token':   APP_TOKEN,
    'x-admin-key':   ADMIN_KEY,
    'x-platform':    'web-admin',
    'x-client-id':   'web-admin-panel',
  },
});

// Restore Authorization header from persisted store on every request
// (covers page reloads where axios defaults are reset)
api.interceptors.request.use(
  (config) => {
    // If no Authorization header yet, try to get it from localStorage
    if (!config.headers['Authorization'] && !config.headers['authorization']) {
      try {
        const stored = localStorage.getItem('lms-web-auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          const token = parsed?.state?.token;
          if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
          }
        }
      } catch (e) {}
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401) {
      try {
        const { useAuthStore } = await import('../store/authStore');
        useAuthStore.getState().logout();
      } catch (e) {}
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
