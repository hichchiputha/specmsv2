import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import LessonsPage from './pages/LessonsPage';
import TeachersPage from './pages/TeachersPage';
import EnrollmentsPage from './pages/EnrollmentsPage';
import SettingsPage from './pages/SettingsPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import BlockedPage from './pages/BlockedPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000, refetchOnWindowFocus: false } },
});

// Block normal browsers — only allow localhost (dev) and Electron
function isAllowedAccess() {
  if (navigator.userAgent.toLowerCase().includes('electron')) return true;
  if (['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) return true;
  return false;
}

// Security guards — disable devtools shortcuts on the admin panel too
function applySecurityListeners() {
  const onContext = (e) => e.preventDefault();
  const onKey = (e) => {
    if (e.key === 'F12') { e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) { e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') { e.preventDefault(); return; }
  };
  document.addEventListener('contextmenu', onContext);
  document.addEventListener('keydown', onKey);
  return () => {
    document.removeEventListener('contextmenu', onContext);
    document.removeEventListener('keydown', onKey);
  };
}

export default function App() {
  const [blocked, setBlocked] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const { validateSession, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Apply security listeners
    const cleanup = applySecurityListeners();

    // Block non-allowed browsers
    if (!isAllowedAccess()) {
      setBlocked(true);
      setSessionChecked(true);
      return cleanup;
    }

    // Validate session then allow render
    validateSession().finally(() => setSessionChecked(true));

    return cleanup;
  }, []);

  if (blocked) return <BlockedPage />;

  // Show spinner while session is being verified
  if (!sessionChecked) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#08080f', flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 36, height: 36,
          border: '3px solid rgba(239,68,68,0.2)',
          borderTopColor: '#ef4444',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        <p style={{ color: '#6060a0', fontSize: 13 }}>Loading admin panel…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
          />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/lessons" element={<LessonsPage />} />
              <Route path="/teachers" element={<TeachersPage />} />
              <Route path="/enrollments" element={<EnrollmentsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1a2e', color: '#e2e8f0',
            border: '1px solid #2d2d44', borderRadius: '12px', fontSize: '14px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}
