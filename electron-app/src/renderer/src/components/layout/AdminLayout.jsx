import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, GraduationCap, BookMarked,
  Settings, LogOut, ArrowLeft, Shield
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const ADMIN_NAV = [
  { to: '/admin', icon: LayoutDashboard, label: 'Overview', exact: true },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/lessons', icon: BookOpen, label: 'Lessons & Seminars' },
  { to: '/admin/teachers', icon: GraduationCap, label: 'Teachers' },
  { to: '/admin/enrollments', icon: BookMarked, label: 'Enrollments' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-void)', overflow: 'hidden' }}>
      {/* Admin Sidebar */}
      <aside style={{
        width: 240, height: '100%', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-deep)', borderRight: '1px solid var(--border-subtle)',
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={18} color="white" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              Admin Panel
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {user?.role}
            </div>
          </div>
        </div>

        {/* Back to app */}
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 13, borderBottom: '1px solid var(--border-subtle)',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <ArrowLeft size={15} /> Back to Academy
        </button>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          {ADMIN_NAV.map(({ to, icon: Icon, label, exact }) => (
            <NavLink key={to} to={to} end={exact} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 10, marginBottom: 2, cursor: 'pointer',
                  background: isActive ? 'rgba(239,68,68,0.1)' : 'transparent',
                  color: isActive ? '#ef4444' : 'var(--text-secondary)',
                  borderLeft: isActive ? '2px solid #ef4444' : '2px solid transparent',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon size={17} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 400 }}>{label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', marginBottom: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: 'white',
            }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.email}</div>
            </div>
          </div>
          <button
            onClick={async () => { await logout(); navigate('/login'); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              borderRadius: 8, border: 'none', background: 'transparent',
              color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--error-bg)'; e.currentTarget.style.color = 'var(--error)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <LogOut size={15} /> Log Out
          </button>
        </div>
      </aside>

      {/* Admin Content */}
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <Outlet />
      </main>
    </div>
  );
}
