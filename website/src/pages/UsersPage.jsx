import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, UserX, UserCheck, BookMarked, X, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

function UserModal({ user, onClose, onSaved }) {
  const isEdit = !!user?.id;
  const [form, setForm] = useState({
    firstName: user?.first_name || '', lastName: user?.last_name || '',
    email: user?.email || '', phone: user?.phone || '',
    role: user?.role || 'student', password: '',
    isActive: user?.is_active !== 0, isVerified: user?.is_verified === 1,
  });
  const mutation = useMutation({
    mutationFn: (d) => isEdit ? api.put(`/admin/users/${user.id}`, d) : api.post('/admin/users', d),
    onSuccess: () => { toast.success(isEdit ? 'Updated!' : 'Created!'); onSaved(); },
    onError: (e) => toast.error(e.response?.data?.error || e.response?.data?.errors?.[0]?.msg || e.message || "Operation failed"),
  });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const setB = k => e => setForm(p => ({ ...p, [k]: e.target.checked }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Edit User' : 'Create User'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div className="grid-2">
            <div className="input-group"><label className="input-label">First Name</label><input className="input" value={form.firstName} onChange={set('firstName')} required /></div>
            <div className="input-group"><label className="input-label">Last Name</label><input className="input" value={form.lastName} onChange={set('lastName')} required /></div>
          </div>
          <div className="input-group"><label className="input-label">Email</label><input type="email" className="input" value={form.email} onChange={set('email')} required /></div>
          <div className="input-group"><label className="input-label">Phone</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
          <div className="input-group">
            <label className="input-label">Role</label>
            <select className="input" value={form.role} onChange={set('role')}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="input-group"><label className="input-label">{isEdit ? 'New Password (blank = keep)' : 'Password *'}</label><input type="password" className="input" value={form.password} onChange={set('password')} required={!isEdit} /></div>
          {isEdit && (
            <div style={{ display: 'flex', gap: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}><input type="checkbox" checked={form.isActive} onChange={setB('isActive')} /> Active</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}><input type="checkbox" checked={form.isVerified} onChange={setB('isVerified')} /> Verified</label>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={mutation.isPending}
              onClick={() => { const d = { ...form }; if (isEdit && !d.password) delete d.password; mutation.mutate(d); }}>
              <Save size={13} /> {mutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EnrollModal({ user, onClose }) {
  const [lessonId, setLessonId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const { data } = useQuery({ queryKey: ['web-lessons-enroll'], queryFn: () => api.get('/lessons', { params: { limit: 100 } }).then(r => r.data) });
  const mutation = useMutation({
    mutationFn: () => api.post('/enrollments/admin-enroll', { userId: user.id, lessonId, paymentStatus }),
    onSuccess: () => { toast.success('Enrolled!'); onClose(); },
    onError: (e) => toast.error(e.response?.data?.error || e.response?.data?.errors?.[0]?.msg || e.message || "Operation failed"),
  });
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Enroll {user.first_name} {user.last_name}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div className="input-group">
            <label className="input-label">Lesson / Seminar</label>
            <select className="input" value={lessonId} onChange={e => setLessonId(e.target.value)}>
              <option value="">— Choose —</option>
              {(data?.lessons || []).map(l => <option key={l.id} value={l.id}>{l.type === 'seminar' ? '🎙' : '📘'} {l.title} {l.is_free ? '(Free)' : '(Paid)'}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Payment Status</label>
            <select className="input" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}>
              <option value="free">Free</option><option value="paid">Paid</option><option value="pending">Pending</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={!lessonId || mutation.isPending} onClick={() => mutation.mutate()}>
              <BookMarked size={13} /> {mutation.isPending ? 'Enrolling…' : 'Enroll'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['web-users', search, roleFilter, page],
    queryFn: () => api.get('/admin/users', { params: { search: search || undefined, role: roleFilter || undefined, page, limit: 15 } }).then(r => r.data),
    keepPreviousData: true,
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/admin/users/${id}`, { isActive: !isActive }),
    onSuccess: () => { queryClient.invalidateQueries(['web-users']); toast.success('Updated'); },
  });

  const users = data?.users || [];
  const pagination = data?.pagination || {};

  return (
    <div className="page" style={{ paddingBottom: 40 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Users</h1>
          <p className="page-subtitle">{pagination.total || 0} total users</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ type: 'user', data: null })}><Plus size={14} /> Add User</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 340 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input className="input" placeholder="Search name or email…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: 34 }} />
        </div>
        <select className="input" style={{ width: 130 }} value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="">All Roles</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Platform</th><th>Enrolled</th><th>Joined</th><th>Actions</th></tr></thead>
          <tbody>
            {isLoading ? [...Array(5)].map((_, i) => (
              <tr key={i}><td colSpan={7}><div className="skeleton" style={{ height: 18 }} /></td></tr>
            )) : users.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>No users found</td></tr>
            ) : users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                      {u.first_name?.[0]}{u.last_name?.[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{u.first_name} {u.last_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td><span className={`badge ${u.role === 'admin' ? 'badge-red' : u.role === 'teacher' ? 'badge-amber' : 'badge-purple'}`} style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                <td><span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>{u.is_active ? 'Active' : 'Off'}</span></td>
                <td style={{ fontSize: 12 }}>{u.device_platform || '—'}</td>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.enrollment_count}</td>
                <td style={{ fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: 'user', data: u })} style={{ padding: '4px 7px' }}><Edit size={12} /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: 'enroll', data: u })} style={{ padding: '4px 7px' }}><BookMarked size={12} /></button>
                    <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-ghost'}`} onClick={() => toggleActive.mutate({ id: u.id, isActive: u.is_active })} style={{ padding: '4px 7px' }}>
                      {u.is_active ? <UserX size={12} /> : <UserCheck size={12} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 18 }}>
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Page {page} / {pagination.totalPages}</span>
          <button className="btn btn-secondary btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={13} /></button>
        </div>
      )}

      {modal?.type === 'user' && <UserModal user={modal.data} onClose={() => setModal(null)} onSaved={() => { setModal(null); queryClient.invalidateQueries(['web-users']); }} />}
      {modal?.type === 'enroll' && <EnrollModal user={modal.data} onClose={() => setModal(null)} />}
    </div>
  );
}
