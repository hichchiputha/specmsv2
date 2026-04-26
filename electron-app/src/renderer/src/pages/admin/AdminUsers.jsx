import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Edit, UserX, UserCheck, BookMarked,
  X, Save, ChevronLeft, ChevronRight, Shield
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const ROLES = ['student', 'teacher', 'admin'];

// ── Create / Edit User Modal ───────────────────────────────────────────────
function UserModal({ user, onClose, onSaved }) {
  const isEdit = !!user?.id;
  const [form, setForm] = useState({
    firstName:  user?.first_name  || '',
    lastName:   user?.last_name   || '',
    email:      user?.email       || '',
    phone:      user?.phone       || '',
    role:       user?.role        || 'student',
    password:   '',
    isActive:   user ? user.is_active !== 0 : true,
    isVerified: user?.is_verified === 1,
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit
        ? api.put(`/admin/users/${user.id}`, data)
        : api.post('/admin/users', data),
    onSuccess: () => {
      toast.success(isEdit ? 'User updated!' : 'User created successfully!');
      onSaved();
    },
    onError: (err) => {
      const msg = err.response?.data?.error
        || err.response?.data?.errors?.[0]?.msg
        || err.message
        || 'Operation failed';
      toast.error(msg);
    },
  });

  const set  = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const setB = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.checked }));

  const handleSave = () => {
    if (!form.firstName.trim()) { toast.error('First name is required'); return; }
    if (!form.lastName.trim())  { toast.error('Last name is required');  return; }
    if (!form.email.trim())     { toast.error('Email is required');      return; }
    if (!isEdit && form.password.length < 6) {
      toast.error('Password must be at least 6 characters'); return;
    }
    const payload = { ...form };
    if (isEdit && !payload.password) delete payload.password;
    mutation.mutate(payload);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={17} style={{ color: 'var(--accent-primary)' }} />
            {isEdit ? `Edit: ${user.first_name} ${user.last_name}` : 'Create New User'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">First Name *</label>
              <input className="input" value={form.firstName} onChange={set('firstName')} placeholder="John" style={{ userSelect: 'text' }} />
            </div>
            <div className="input-group">
              <label className="input-label">Last Name *</label>
              <input className="input" value={form.lastName} onChange={set('lastName')} placeholder="Doe" style={{ userSelect: 'text' }} />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Email Address *</label>
            <input type="email" className="input" value={form.email} onChange={set('email')} placeholder="john@example.com" style={{ userSelect: 'text' }} />
          </div>

          <div className="input-group">
            <label className="input-label">Phone (optional)</label>
            <input type="tel" className="input" value={form.phone} onChange={set('phone')} placeholder="+1 234 567 8900" style={{ userSelect: 'text' }} />
          </div>

          <div className="input-group">
            <label className="input-label">Role</label>
            <select className="input" value={form.role} onChange={set('role')}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">
              {isEdit ? 'New Password (leave blank to keep current)' : 'Password * (min 6 characters)'}
            </label>
            <input
              type="password" className="input"
              value={form.password} onChange={set('password')}
              placeholder={isEdit ? 'Leave blank to keep' : 'Min 6 characters'}
              required={!isEdit}
              style={{ userSelect: 'text' }}
            />
          </div>

          {isEdit && (
            <div style={{
              display: 'flex', gap: 24, padding: '12px 14px',
              background: 'var(--bg-deep)', borderRadius: 10,
              border: '1px solid var(--border-subtle)',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={form.isActive} onChange={setB('isActive')} />
                Active Account
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={form.isVerified} onChange={setB('isVerified')} />
                Verified
              </label>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={mutation.isPending}
              onClick={handleSave}
            >
              <Save size={14} />
              {mutation.isPending ? 'Saving…' : isEdit ? 'Update User' : 'Create User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Enroll User Modal ──────────────────────────────────────────────────────
function EnrollModal({ user, onClose }) {
  const [lessonId, setLessonId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('paid');

  const { data: lessonsData } = useQuery({
    queryKey: ['all-lessons-enroll'],
    queryFn: () => api.get('/lessons', { params: { limit: 100, sortBy: 'title', sortDir: 'ASC' } }).then((r) => r.data),
  });

  const enrollMutation = useMutation({
    mutationFn: () =>
      api.post('/enrollments/admin-enroll', { userId: user.id, lessonId, paymentStatus }),
    onSuccess: () => { toast.success('User enrolled successfully!'); onClose(); },
    onError: (e) => toast.error(e.response?.data?.error || 'Enrollment failed'),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Enroll {user.first_name} {user.last_name}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="input-group">
            <label className="input-label">Select Lesson / Seminar</label>
            <select className="input" value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
              <option value="">— Choose a lesson —</option>
              {(lessonsData?.lessons || []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.type === 'seminar' ? '🎙' : '📘'} {l.title} {l.is_free ? '(Free)' : '(Paid)'}
                </option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Payment Status</label>
            <select className="input" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending Payment</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={!lessonId || enrollMutation.isPending}
              onClick={() => enrollMutation.mutate()}
            >
              <BookMarked size={14} />
              {enrollMutation.isPending ? 'Enrolling…' : 'Enroll'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage]           = useState(1);
  const [modal, setModal]         = useState(null); // { type: 'user'|'enroll', data }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter, page],
    queryFn: () =>
      api.get('/admin/users', {
        params: {
          search:   search || undefined,
          role:     roleFilter || undefined,
          page,
          limit: 15,
        },
      }).then((r) => r.data),
    keepPreviousData: true,
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/admin/users/${id}`, { isActive: !isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      toast.success('User status updated');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update status'),
  });

  const users      = data?.users      || [];
  const pagination = data?.pagination || {};

  return (
    <div className="page" style={{ paddingBottom: 40 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 User Management</h1>
          <p className="page-subtitle">{pagination.total || 0} total users</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ type: 'user', data: null })}>
          <Plus size={15} /> Add User
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 360 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            className="input"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ paddingLeft: 36, userSelect: 'text' }}
          />
        </div>
        <select
          className="input" style={{ width: 140 }}
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Platform</th>
              <th>Enrolled</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}><td colSpan={7}>
                  <div className="skeleton" style={{ height: 20, borderRadius: 4 }} />
                </td></tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                {search || roleFilter ? 'No users match your filters' : 'No users yet'}
              </td></tr>
            ) : users.map((u) => (
              <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                      background: u.avatar_url
                        ? 'transparent'
                        : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: 'white', overflow: 'hidden',
                    }}>
                      {u.avatar_url
                        ? <img src={`http://localhost:3001${u.avatar_url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                        : `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`
                      }
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                        {u.first_name} {u.last_name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'badge-red' : u.role === 'teacher' ? 'badge-amber' : 'badge-purple'}`} style={{ textTransform: 'capitalize' }}>
                    {u.role}
                  </span>
                </td>
                <td>
                  <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ fontSize: 12, textTransform: 'capitalize' }}>{u.device_platform || '—'}</td>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.enrollment_count}</td>
                <td style={{ fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      title="Edit user"
                      onClick={() => setModal({ type: 'user', data: u })}
                      style={{ padding: '5px 8px' }}
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      title="Enroll in lesson"
                      onClick={() => setModal({ type: 'enroll', data: u })}
                      style={{ padding: '5px 8px' }}
                    >
                      <BookMarked size={13} />
                    </button>
                    <button
                      className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-ghost'}`}
                      title={u.is_active ? 'Deactivate' : 'Activate'}
                      disabled={toggleActive.isPending}
                      onClick={() => toggleActive.mutate({ id: u.id, isActive: u.is_active })}
                      style={{ padding: '5px 8px' }}
                    >
                      {u.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 }}>
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Page {page} of {pagination.totalPages}
          </span>
          <button className="btn btn-secondary btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {modal?.type === 'user' && (
          <UserModal
            user={modal.data}
            onClose={() => setModal(null)}
            onSaved={() => {
              setModal(null);
              queryClient.invalidateQueries(['admin-users']);
              queryClient.invalidateQueries(['admin-stats']);
            }}
          />
        )}
        {modal?.type === 'enroll' && (
          <EnrollModal user={modal.data} onClose={() => setModal(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
