// Layout.jsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, GraduationCap,
  BookMarked, Settings, LogOut, Shield
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Overview', exact: true },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/lessons', icon: BookOpen, label: 'Lessons & Seminars' },
  { to: '/teachers', icon: GraduationCap, label: 'Teachers' },
  { to: '/enrollments', icon: BookMarked, label: 'Enrollments' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-void)', overflow: 'hidden' }}>
      <aside style={{
        width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'var(--bg-deep)', borderRight: '1px solid var(--border-subtle)',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#ef4444,#f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Admin Portal</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>LMS Management</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          {NAV.map(({ to, icon: Icon, label, exact }) => (
            <NavLink key={to} to={to} end={exact} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '10px 12px', borderRadius: 10, marginBottom: 2, cursor: 'pointer',
                  background: isActive ? 'rgba(239,68,68,0.1)' : 'transparent',
                  color: isActive ? '#ef4444' : 'var(--text-secondary)',
                  borderLeft: isActive ? '2px solid #ef4444' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon size={16} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400 }}>{label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', marginBottom: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#ef4444,#f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }} className="truncate">{user?.firstName} {user?.lastName}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          </div>
          <button
            onClick={async () => { await logout(); navigate('/login'); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--error-bg)'; e.currentTarget.style.color = 'var(--error)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'hidden' }}>
        <Outlet />
      </main>
    </div>
  );
}
