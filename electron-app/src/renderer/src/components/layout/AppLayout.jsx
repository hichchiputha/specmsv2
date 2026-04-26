import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, BookOpen, Video, Users, Search,
  GraduationCap, User, LogOut, ChevronRight, Bell, Settings,
  Shield, BookMarked, Menu, X
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/lessons', icon: BookOpen, label: 'Lessons' },
  { to: '/seminars', icon: Video, label: 'Seminars' },
  { to: '/teachers', icon: GraduationCap, label: 'Teachers' },
  { to: '/my-learning', icon: BookMarked, label: 'My Learning' },
  { to: '/search', icon: Search, label: 'Search' },
];

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'teacher';
  const sidebarW = collapsed ? 64 : 240;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-void)', overflow: 'hidden' }}>
      {/* Sidebar */}
      <motion.aside
        animate={{ width: sidebarW }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: 'var(--bg-deep)', borderRight: '1px solid var(--border-subtle)',
          overflow: 'hidden', position: 'relative',
        }}
      >
        {/* Logo */}
        <div style={{
          padding: collapsed ? '20px 0' : '20px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '1px solid var(--border-subtle)', minHeight: 72,
          justifyContent: collapsed ? 'center' : 'space-between',
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <GraduationCap size={18} color="white" />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                  LMS Academy
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Learning Platform
                </div>
              </div>
            </div>
          )}
          {collapsed && (
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GraduationCap size={18} color="white" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 4, borderRadius: 6,
              display: 'flex', alignItems: 'center',
              ...(collapsed ? { position: 'absolute', right: -14, top: 26, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '50%', width: 28, height: 28, justifyContent: 'center', zIndex: 10 } : {}),
            }}
          >
            {collapsed ? <ChevronRight size={14} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <div style={{
                  display: 'flex', alignItems: 'center',
                  gap: 12, padding: collapsed ? '10px 0' : '10px 12px',
                  borderRadius: 10, marginBottom: 2, cursor: 'pointer',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  borderLeft: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon size={18} style={{ flexShrink: 0 }} />
                  {!collapsed && (
                    <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap' }}>
                      {label}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div style={{
                padding: collapsed ? '12px 0' : '12px 12px 6px',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--text-muted)',
                textAlign: collapsed ? 'center' : 'left',
              }}>
                {!collapsed ? 'Admin' : '—'}
              </div>
              <NavLink to="/admin" style={{ textDecoration: 'none' }}>
                {({ isActive }) => (
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    gap: 12, padding: collapsed ? '10px 0' : '10px 12px',
                    borderRadius: 10, marginBottom: 2, cursor: 'pointer',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    borderLeft: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Shield size={18} style={{ flexShrink: 0 }} />
                    {!collapsed && <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 400 }}>Admin Panel</span>}
                  </div>
                )}
              </NavLink>
            </>
          )}
        </nav>

        {/* User Profile */}
        <div style={{
          padding: collapsed ? '12px 8px' : '12px',
          borderTop: '1px solid var(--border-subtle)',
        }}>
          <NavLink to="/profile" style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              gap: 10, padding: '8px',
              borderRadius: 10, cursor: 'pointer',
              justifyContent: collapsed ? 'center' : 'flex-start',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: 'white',
              }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              {!collapsed && (
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {user?.role}
                  </div>
                </div>
              )}
            </div>
          </NavLink>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              gap: 10, padding: '8px',
              borderRadius: 10, cursor: 'pointer', border: 'none', background: 'transparent',
              color: 'var(--text-muted)', fontSize: 13, marginTop: 4,
              justifyContent: collapsed ? 'center' : 'flex-start',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--error-bg)'; e.currentTarget.style.color = 'var(--error)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <LogOut size={16} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Log Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{
          height: 56, flexShrink: 0, background: 'var(--bg-deep)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Breadcrumb area - can be extended */}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NavLink to="/search">
              <button className="btn btn-ghost btn-sm" style={{ padding: '6px 10px' }}>
                <Search size={16} />
              </button>
            </NavLink>
            <NavLink to="/profile">
              <button className="btn btn-ghost btn-sm" style={{ padding: '6px 10px' }}>
                <Bell size={16} />
              </button>
            </NavLink>
          </div>
        </div>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'hidden' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
