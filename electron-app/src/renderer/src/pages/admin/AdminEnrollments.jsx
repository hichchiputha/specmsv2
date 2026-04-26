import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight, Edit, X, Save } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';

function EditEnrollmentModal({ enrollment, onClose, onSaved }) {
  const [status, setStatus] = useState(enrollment.status);
  const [paymentStatus, setPaymentStatus] = useState(enrollment.payment_status);

  const mutation = useMutation({
    mutationFn: () => api.put(`/admin/enrollments/${enrollment.id}`, { status, paymentStatus }),
    onSuccess: () => { toast.success('Enrollment updated!'); onSaved(); },
    onError: () => toast.error('Update failed'),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Enrollment</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--bg-deep)', borderRadius: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{enrollment.user_name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{enrollment.lesson_title}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="input-group">
            <label className="input-label">Enrollment Status</label>
            <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Payment Status</label>
            <select className="input" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              <Save size={14} /> {mutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminEnrollments() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-enrollments', statusFilter, page],
    queryFn: () => api.get('/admin/enrollments', {
      params: { status: statusFilter || undefined, page, limit: 15 },
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const enrollments = data?.enrollments || [];
  const pagination = data?.pagination || {};

  const statusBadge = (s) => {
    const map = { active: 'badge-green', completed: 'badge-cyan', suspended: 'badge-red', pending: 'badge-amber' };
    return map[s] || 'badge-gray';
  };

  const payBadge = (s) => {
    const map = { free: 'badge-green', paid: 'badge-cyan', pending: 'badge-amber', refunded: 'badge-red' };
    return map[s] || 'badge-gray';
  };

  return (
    <div className="page" style={{ paddingBottom: 40 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Enrollments</h1>
          <p className="page-subtitle">{pagination.total || 0} total enrollments</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { v: '', l: 'All' },
          { v: 'active', l: 'Active' },
          { v: 'completed', l: 'Completed' },
          { v: 'suspended', l: 'Suspended' },
          { v: 'pending', l: 'Pending' },
        ].map(({ v, l }) => (
          <button key={v} className={`btn btn-sm ${statusFilter === v ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setStatusFilter(v); setPage(1); }}>
            {l}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Student</th><th>Lesson</th><th>Type</th><th>Status</th><th>Payment</th><th>Progress</th><th>Enrolled</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => <tr key={i}><td colSpan={8}><div className="skeleton" style={{ height: 20, borderRadius: 4 }} /></td></tr>)
            ) : enrollments.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No enrollments found</td></tr>
            ) : enrollments.map(e => (
              <tr key={e.id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{e.user_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.email}</div>
                </td>
                <td style={{ fontSize: 13, maxWidth: 160 }} className="truncate">{e.lesson_title}</td>
                <td><span className={`badge ${e.type === 'seminar' ? 'badge-cyan' : 'badge-purple'}`} style={{ textTransform: 'capitalize' }}>{e.type}</span></td>
                <td><span className={`badge ${statusBadge(e.status)}`} style={{ textTransform: 'capitalize' }}>{e.status}</span></td>
                <td><span className={`badge ${payBadge(e.payment_status)}`} style={{ textTransform: 'capitalize' }}>{e.payment_status}</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="progress-bar" style={{ width: 60, height: 4 }}>
                      <div className="progress-bar-fill" style={{ width: `${e.progress}%` }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{Math.round(e.progress)}%</span>
                  </div>
                </td>
                <td style={{ fontSize: 12 }}>{new Date(e.enrolled_at).toLocaleDateString()}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => setModal(e)} style={{ padding: '5px 8px' }}><Edit size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 }}>
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Page {page} / {pagination.totalPages}</span>
          <button className="btn btn-secondary btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <EditEnrollmentModal
            enrollment={modal}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); queryClient.invalidateQueries(['admin-enrollments']); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
