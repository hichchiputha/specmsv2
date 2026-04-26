import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, BookOpen, GraduationCap, BookMarked,
  TrendingUp, CheckCircle, Plus, ArrowRight,
  Video, FileText, Bell
} from 'lucide-react';
import api from '../../utils/api';
import { motion } from 'framer-motion';

function StatCard({ icon, label, value, color, sub }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
        borderRadius: 16, padding: '20px 22px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}
    >
      <div style={{
        width: 46, height: 46, borderRadius: 13, flexShrink: 0,
        background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color, marginTop: 2, fontWeight: 500 }}>{sub}</div>}
      </div>
    </motion.div>
  );
}

function QuickAction({ icon, label, desc, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px', background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)', borderRadius: 14,
        cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', width: '100%',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--bg-surface)'; }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{desc}</div>
      </div>
      <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
    </button>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
    staleTime: 30 * 1000,
  });

  return (
    <div className="page" style={{ paddingBottom: 40 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">🛡 Admin Overview</h1>
          <p className="page-subtitle">Manage your entire LMS platform from here</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => navigate('/admin/lessons')}>
            <Plus size={15} /> Add Lesson
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        <StatCard icon={<Users size={20} color="#7c3aed" />} label="Total Students" value={isLoading ? '…' : stats?.users || 0} color="#7c3aed" />
        <StatCard icon={<GraduationCap size={20} color="#06b6d4" />} label="Teachers" value={isLoading ? '…' : stats?.teachers || 0} color="#06b6d4" />
        <StatCard icon={<BookOpen size={20} color="#10b981" />} label="Lessons" value={isLoading ? '…' : stats?.lessons || 0} color="#10b981" />
        <StatCard icon={<Video size={20} color="#f59e0b" />} label="Seminars" value={isLoading ? '…' : stats?.seminars || 0} color="#f59e0b" />
      </div>
      <div className="grid-2" style={{ marginBottom: 32 }}>
        <StatCard icon={<BookMarked size={20} color="#ec4899" />} label="Active Enrollments" value={isLoading ? '…' : stats?.enrollments || 0} color="#ec4899" />
        <StatCard icon={<CheckCircle size={20} color="#10b981" />} label="Completions" value={isLoading ? '…' : stats?.completions || 0} color="#10b981" sub="lessons completed by students" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, alignItems: 'start' }}>

        {/* Recent Users */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>Recent Students</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/users')}>View all <ArrowRight size={12} /></button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? [...Array(4)].map((_, i) => (
                  <tr key={i}><td colSpan={4}><div className="skeleton" style={{ height: 20, borderRadius: 4 }} /></td></tr>
                )) : (stats?.recentUsers || []).map(u => (
                  <tr key={u.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{u.first_name} {u.last_name}</td>
                    <td className="truncate" style={{ maxWidth: 160 }}>{u.email}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Quick Actions */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: 14 }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <QuickAction icon={<Plus size={17} color="#7c3aed" />} label="Add New Lesson" desc="Create a lesson with video" color="#7c3aed" onClick={() => navigate('/admin/lessons')} />
              <QuickAction icon={<Video size={17} color="#06b6d4" />} label="Add Seminar" desc="Create a seminar session" color="#06b6d4" onClick={() => navigate('/admin/lessons')} />
              <QuickAction icon={<Users size={17} color="#10b981" />} label="Manage Users" desc="View, edit, enroll students" color="#10b981" onClick={() => navigate('/admin/users')} />
              <QuickAction icon={<GraduationCap size={17} color="#f59e0b" />} label="Manage Teachers" desc="Add teacher profiles" color="#f59e0b" onClick={() => navigate('/admin/teachers')} />
              <QuickAction icon={<Bell size={17} color="#ec4899" />} label="Post Announcement" desc="Notify all students" color="#ec4899" onClick={() => navigate('/admin/settings')} />
            </div>
          </div>

          {/* Popular lessons */}
          {stats?.popularLessons?.length > 0 && (
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: 14 }}>
                <TrendingUp size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: 'var(--accent-primary)' }} />
                Popular Lessons
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stats.popularLessons.map((l, i) => (
                  <div key={l.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                      background: i === 0 ? '#f59e0b22' : 'var(--bg-elevated)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                      color: i === 0 ? '#f59e0b' : 'var(--text-muted)',
                    }}>
                      {i + 1}
                    </div>
                    <div className="truncate" style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{l.title}</div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{l.enrollment_count} enrolled</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
