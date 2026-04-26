import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, BookOpen, GraduationCap, BookMarked,
  CheckCircle, TrendingUp, ArrowRight, Plus
} from 'lucide-react';
import api from '../utils/api';

function Stat({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
      borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['web-admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
    staleTime: 30000,
  });

  return (
    <div className="page" style={{ paddingBottom: 40 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">🛡 Admin Overview</h1>
          <p className="page-subtitle">Platform-wide management dashboard</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/lessons')}>
          <Plus size={14} /> Add Lesson
        </button>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <Stat icon={<Users size={19} color="#7c3aed" />} label="Students" value={isLoading ? '…' : data?.users ?? 0} color="#7c3aed" />
        <Stat icon={<GraduationCap size={19} color="#06b6d4" />} label="Teachers" value={isLoading ? '…' : data?.teachers ?? 0} color="#06b6d4" />
        <Stat icon={<BookOpen size={19} color="#10b981" />} label="Lessons" value={isLoading ? '…' : data?.lessons ?? 0} color="#10b981" />
        <Stat icon={<BookMarked size={19} color="#f59e0b" />} label="Seminars" value={isLoading ? '…' : data?.seminars ?? 0} color="#f59e0b" />
      </div>
      <div className="grid-2" style={{ marginBottom: 28 }}>
        <Stat icon={<TrendingUp size={19} color="#ec4899" />} label="Active Enrollments" value={isLoading ? '…' : data?.enrollments ?? 0} color="#ec4899" />
        <Stat icon={<CheckCircle size={19} color="#10b981" />} label="Completions" value={isLoading ? '…' : data?.completions ?? 0} color="#10b981" />
      </div>

      <div className="grid-2">
        {/* Recent Users */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent Students</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/users')}>View all <ArrowRight size={12} /></button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Status</th></tr></thead>
              <tbody>
                {isLoading ? [...Array(4)].map((_, i) => (
                  <tr key={i}><td colSpan={4}><div className="skeleton" style={{ height: 18 }} /></td></tr>
                )) : (data?.recentUsers || []).map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{u.first_name} {u.last_name}</td>
                    <td className="truncate" style={{ maxWidth: 150, fontSize: 12 }}>{u.email}</td>
                    <td style={{ fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td><span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>{u.is_active ? 'Active' : 'Off'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Popular Lessons */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Popular Lessons</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/lessons')}>View all <ArrowRight size={12} /></button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Title</th><th>Enrolled</th><th>Views</th></tr></thead>
              <tbody>
                {isLoading ? [...Array(4)].map((_, i) => (
                  <tr key={i}><td colSpan={4}><div className="skeleton" style={{ height: 18 }} /></td></tr>
                )) : (data?.popularLessons || []).map((l, i) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 700, color: i === 0 ? '#f59e0b' : 'var(--text-muted)', width: 32 }}>{i + 1}</td>
                    <td className="truncate" style={{ maxWidth: 160, fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{l.title}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{l.enrollment_count}</td>
                    <td style={{ fontSize: 12 }}>{l.view_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
