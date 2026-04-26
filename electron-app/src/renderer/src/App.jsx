import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import LessonsPage from './pages/LessonsPage';
import LessonDetailPage from './pages/LessonDetailPage';
import VideoPlayerPage from './pages/VideoPlayerPage';
import SeminarsPage from './pages/SeminarsPage';
import TeachersPage from './pages/TeachersPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';
import MyLearningPage from './pages/MyLearningPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminLessons from './pages/admin/AdminLessons';
import AdminTeachers from './pages/admin/AdminTeachers';
import AdminEnrollments from './pages/admin/AdminEnrollments';
import AdminSettings from './pages/admin/AdminSettings';

// Components
import AppLayout from './components/layout/AppLayout';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import UpdateBanner from './components/UpdateBanner';

import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000, refetchOnWindowFocus: false },
  },
});

// ── Security: Disable right-click & devtools shortcuts in renderer ──
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('keydown', (e) => {
  if (window.__IS_DEV__) return;
  if (e.key === 'F12') { e.preventDefault(); return; }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) { e.preventDefault(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') { e.preventDefault(); return; }
});
document.addEventListener('selectstart', (e) => {
  if (!e.target.matches('input, textarea, [contenteditable], [data-selectable]')) e.preventDefault();
});

function AppRoutes() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />

      {/* Student/Teacher routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/lessons" element={<LessonsPage />} />
          <Route path="/lessons/:id" element={<LessonDetailPage />} />
          <Route path="/lessons/:id/watch" element={<VideoPlayerPage />} />
          <Route path="/seminars" element={<SeminarsPage />} />
          <Route path="/seminars/:id" element={<LessonDetailPage />} />
          <Route path="/seminars/:id/watch" element={<VideoPlayerPage />} />
          <Route path="/teachers" element={<TeachersPage />} />
          <Route path="/my-learning" element={<MyLearningPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* Admin/Teacher routes */}
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/lessons" element={<AdminLessons />} />
          <Route path="/admin/teachers" element={<AdminTeachers />} />
          <Route path="/admin/enrollments" element={<AdminEnrollments />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>
      </Route>

      {/* Default */}
      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const { validateSession } = useAuthStore();
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    // Mark dev mode
    if (window.electron) {
      window.electron.getAppInfo().then(info => {
        window.__IS_DEV__ = info?.isDev;
      }).catch(() => {});
    }

    // Validate session then render routes
    validateSession().finally(() => setSessionChecked(true));
  }, []);

  // Show blank screen while checking session to avoid flash of login
  if (!sessionChecked) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#08080f',
      }}>
        <div style={{
          width: 40, height: 40, border: '3px solid rgba(124,58,237,0.3)',
          borderTopColor: '#7c3aed', borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <UpdateBanner />
        <AppRoutes />
      </HashRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1a2e',
            color: '#e2e8f0',
            border: '1px solid #2d2d44',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}
