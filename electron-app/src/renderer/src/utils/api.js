import axios from 'axios';

// Module-level state — updated once Electron app info loads
let appToken = 'lms-electron-app-token-v1';
let platform = 'web';
let clientId = 'unknown';
let initialized = false;

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Initialize headers from Electron main process
// We use a promise so multiple early callers can await it
let initPromise = null;

function ensureInit() {
  if (initialized) return Promise.resolve();
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      if (window.electron) {
        const [info, url] = await Promise.all([
          window.electron.getAppInfo(),
          window.electron.getApiUrl(),
        ]);
        appToken = info.appToken || appToken;
        platform  = info.platform  || platform;
        clientId  = info.deviceId  || clientId;
        api.defaults.baseURL = (url || 'http://localhost:3001') + '/api';
      }
    } catch (e) {
      console.warn('Electron info unavailable, using defaults');
    } finally {
      initialized = true;
    }
  })();

  return initPromise;
}

// Kick off init immediately on module load
ensureInit();

// ── Request interceptor ────────────────────────────────────────────────────
// Awaits init so the FIRST request always has the correct appToken
api.interceptors.request.use(
  async (config) => {
    await ensureInit();
    
    // Inject app token (allows the backend to identify this as the LMS Electron app)
    config.headers['x-app-token'] = appToken;
    config.headers['x-platform']  = platform;
    config.headers['x-client-id'] = clientId;
    
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ───────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const code   = error.response?.data?.code;
    
    if (status === 401 || status === 403) {
      // Don't logout on INVALID_CLIENT / INVALID_APP_TOKEN — those are config issues
      if (code === 'INVALID_CLIENT' || code === 'INVALID_APP_TOKEN') {
        console.error('App token rejected by server. Check APP_TOKEN in .env');
        return Promise.reject(error);
      }
      
      // Session expired or invalid JWT — clear auth and redirect to login
      if (status === 401) {
        try {
          const { useAuthStore } = await import('../store/authStore');
          const store = useAuthStore.getState();
          if (store.isAuthenticated) {
            await store.logout();
            window.location.hash = '/login';
          }
        } catch (e) {}
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
