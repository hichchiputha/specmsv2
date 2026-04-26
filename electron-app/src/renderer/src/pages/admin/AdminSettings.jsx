import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Copy, RefreshCw, Bell, Key, Tag, X, Save } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';

function AnnouncementModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', content: '', type: 'general', targetRole: 'all', expiresAt: '' });
  const mutation = useMutation({
    mutationFn: () => api.post('/admin/announcements', form),
    onSuccess: () => { toast.success('Announcement posted!'); onSaved(); },
    onError: () => toast.error('Failed to post'),
  });
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>New Announcement</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="input-group">
            <label className="input-label">Title *</label>
            <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required style={{ userSelect: 'text' }} />
          </div>
          <div className="input-group">
            <label className="input-label">Content *</label>
            <textarea className="input" rows={4} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} required style={{ resize: 'vertical', userSelect: 'text' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">Target</label>
              <select className="input" value={form.targetRole} onChange={e => setForm(p => ({ ...p, targetRole: e.target.value }))}>
                <option value="all">All Users</option>
                <option value="student">Students Only</option>
                <option value="teacher">Teachers Only</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Expires (optional)</label>
              <input type="date" className="input" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))} style={{ userSelect: 'text' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={mutation.isPending || !form.title || !form.content} onClick={() => mutation.mutate()}>
              <Bell size={14} /> {mutation.isPending ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', icon: '📂', color: '#6366f1' });
  const mutation = useMutation({
    mutationFn: () => api.post('/admin/categories', form),
    onSuccess: () => { toast.success('Category created!'); onSaved(); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>New Category</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="input-group">
            <label className="input-label">Name *</label>
            <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required style={{ userSelect: 'text' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">Icon (emoji)</label>
              <input className="input" value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} maxLength={2} style={{ fontSize: 22, textAlign: 'center', userSelect: 'text' }} />
            </div>
            <div className="input-group">
              <label className="input-label">Color</label>
              <input type="color" className="input" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} style={{ padding: 6, cursor: 'pointer' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={mutation.isPending || !form.name} onClick={() => mutation.mutate()}>
              <Save size={14} /> Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('announcements');
  const [modal, setModal] = useState(null);

  const { data: announcementsData } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: () => api.get('/admin/announcements').then(r => r.data),
    enabled: activeTab === 'announcements',
  });

  const { data: tokensData } = useQuery({
    queryKey: ['admin-tokens'],
    queryFn: () => api.get('/admin/app-tokens').then(r => r.data),
    enabled: activeTab === 'tokens',
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api.get('/admin/categories').then(r => r.data),
    enabled: activeTab === 'categories',
  });

  const deleteAnnouncement = useMutation({
    mutationFn: (id) => api.delete(`/admin/announcements/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['admin-announcements']); toast.success('Removed'); },
  });

  const createToken = useMutation({
    mutationFn: () => api.post('/admin/app-tokens', { platform: 'all', description: 'Electron App Token' }),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['admin-tokens']);
      toast.success('Token created!');
    },
  });

  const toggleToken = useMutation({
    mutationFn: (id) => api.put(`/admin/app-tokens/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries(['admin-tokens']),
  });

  const tabs = [
    { id: 'announcements', label: '📢 Announcements', icon: Bell },
    { id: 'tokens', label: '🔑 App Tokens', icon: Key },
    { id: 'categories', label: '🏷 Categories', icon: Tag },
  ];

  return (
    <div className="page" style={{ paddingBottom: 40 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ Settings</h1>
          <p className="page-subtitle">Manage announcements, app access tokens, and categories</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {tabs.map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id)} className={`btn btn-sm ${activeTab === id ? 'btn-primary' : 'btn-ghost'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Announcements */}
      {activeTab === 'announcements' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-primary" onClick={() => setModal('announcement')}>
              <Plus size={15} /> New Announcement
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(announcementsData?.announcements || []).length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-state-icon">📢</div>
                <p>No announcements yet</p>
              </div>
            ) : (announcementsData?.announcements || []).map(a => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px',
                background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                borderRadius: 12, borderLeft: `3px solid ${a.is_active ? 'var(--accent-primary)' : 'var(--border-default)'}`,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{a.title}</span>
                    <span className={`badge ${a.is_active ? 'badge-green' : 'badge-gray'}`}>{a.is_active ? 'Active' : 'Inactive'}</span>
                    <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{a.target_role}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{a.content}</p>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    By {a.created_by_name || 'Admin'} · {new Date(a.created_at).toLocaleDateString()}
                    {a.expires_at && ` · Expires ${new Date(a.expires_at).toLocaleDateString()}`}
                  </div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => deleteAnnouncement.mutate(a.id)} style={{ padding: '5px 8px', flexShrink: 0 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* App Tokens */}
      {activeTab === 'tokens' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.6 }}>
              App tokens are used by Electron installations to authenticate with the backend. Only the Electron app with a valid token can access the API.
            </p>
            <button className="btn btn-primary" disabled={createToken.isPending} onClick={() => createToken.mutate()}>
              <Plus size={15} /> Generate Token
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(tokensData?.tokens || []).map(t => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9, background: t.is_active ? 'var(--success-bg)' : 'var(--error-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Key size={15} style={{ color: t.is_active ? 'var(--success)' : 'var(--error)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <code style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12,
                    color: 'var(--text-primary)', display: 'block', marginBottom: 3,
                  }}>
                    {t.token}
                  </code>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {t.platform} · {t.description} · Created {new Date(t.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span className={`badge ${t.is_active ? 'badge-green' : 'badge-red'}`}>{t.is_active ? 'Active' : 'Disabled'}</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { navigator.clipboard.writeText(t.token); toast.success('Copied!'); }}
                  style={{ padding: '5px 8px' }}
                >
                  <Copy size={13} />
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => toggleToken.mutate(t.id)} style={{ padding: '5px 8px' }}>
                  <RefreshCw size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      {activeTab === 'categories' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-primary" onClick={() => setModal('category')}>
              <Plus size={15} /> Add Category
            </button>
          </div>
          <div className="grid-4">
            {(categoriesData?.categories || []).map(c => (
              <div key={c.id} style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                borderRadius: 14, padding: '16px 18px',
                borderTop: `3px solid ${c.color}`,
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.lesson_count} lesson{c.lesson_count !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {modal === 'announcement' && (
          <AnnouncementModal
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); queryClient.invalidateQueries(['admin-announcements']); }}
          />
        )}
        {modal === 'category' && (
          <CategoryModal
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); queryClient.invalidateQueries(['admin-categories']); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
