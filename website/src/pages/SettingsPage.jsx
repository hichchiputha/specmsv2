import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Copy, RefreshCw, Bell, Key, Tag, X, Save } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('announcements');
  const [annForm, setAnnForm] = useState({ title: '', content: '', targetRole: 'all', expiresAt: '' });
  const [catForm, setCatForm] = useState({ name: '', icon: '📂', color: '#6366f1' });
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);

  const { data: annData } = useQuery({ queryKey: ['web-ann'], queryFn: () => api.get('/admin/announcements').then(r => r.data), enabled: tab === 'announcements' });
  const { data: tokData } = useQuery({ queryKey: ['web-tok'], queryFn: () => api.get('/admin/app-tokens').then(r => r.data), enabled: tab === 'tokens' });
  const { data: catData } = useQuery({ queryKey: ['web-cats-settings'], queryFn: () => api.get('/admin/categories').then(r => r.data), enabled: tab === 'categories' });

  const postAnn = useMutation({
    mutationFn: () => api.post('/admin/announcements', annForm),
    onSuccess: () => { toast.success('Posted!'); setAnnForm({ title: '', content: '', targetRole: 'all', expiresAt: '' }); setShowAnnForm(false); queryClient.invalidateQueries(['web-ann']); },
    onError: () => toast.error('Failed'),
  });

  const delAnn = useMutation({
    mutationFn: (id) => api.delete(`/admin/announcements/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['web-ann']); toast.success('Removed'); },
  });

  const createToken = useMutation({
    mutationFn: () => api.post('/admin/app-tokens', { platform: 'all', description: 'Electron App Token' }),
    onSuccess: () => { queryClient.invalidateQueries(['web-tok']); toast.success('Token generated!'); },
  });

  const toggleToken = useMutation({
    mutationFn: (id) => api.put(`/admin/app-tokens/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries(['web-tok']),
  });

  const createCat = useMutation({
    mutationFn: () => api.post('/admin/categories', catForm),
    onSuccess: () => { toast.success('Category created!'); setCatForm({ name: '', icon: '📂', color: '#6366f1' }); setShowCatForm(false); queryClient.invalidateQueries(['web-cats-settings']); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });

  return (
    <div className="page" style={{ paddingBottom: 40 }}>
      <div className="page-header">
        <div><h1 className="page-title">⚙️ Settings</h1><p className="page-subtitle">Announcements, app tokens, categories</p></div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {[{ id: 'announcements', l: '📢 Announcements' }, { id: 'tokens', l: '🔑 App Tokens' }, { id: 'categories', l: '🏷 Categories' }].map(({ id, l }) => (
          <button key={id} onClick={() => setTab(id)} className={`btn btn-sm ${tab === id ? 'btn-primary' : 'btn-ghost'}`}>{l}</button>
        ))}
      </div>

      {tab === 'announcements' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button className="btn btn-primary" onClick={() => setShowAnnForm(true)}><Plus size={13} /> New Announcement</button>
          </div>
          {showAnnForm && (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <h4 style={{ marginBottom: 14, fontWeight: 700 }}>New Announcement</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="input-group"><label className="input-label">Title *</label><input className="input" value={annForm.title} onChange={e => setAnnForm(p => ({ ...p, title: e.target.value }))} /></div>
                <div className="input-group"><label className="input-label">Content *</label><textarea className="input" rows={3} value={annForm.content} onChange={e => setAnnForm(p => ({ ...p, content: e.target.value }))} style={{ resize: 'vertical' }} /></div>
                <div className="grid-2">
                  <div className="input-group"><label className="input-label">Target</label>
                    <select className="input" value={annForm.targetRole} onChange={e => setAnnForm(p => ({ ...p, targetRole: e.target.value }))}>
                      <option value="all">All</option><option value="student">Students</option><option value="teacher">Teachers</option>
                    </select>
                  </div>
                  <div className="input-group"><label className="input-label">Expires</label><input type="date" className="input" value={annForm.expiresAt} onChange={e => setAnnForm(p => ({ ...p, expiresAt: e.target.value }))} /></div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-secondary" onClick={() => setShowAnnForm(false)} style={{ flex: 1 }}>Cancel</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} disabled={postAnn.isPending || !annForm.title || !annForm.content} onClick={() => postAnn.mutate()}>
                    <Bell size={13} /> {postAnn.isPending ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(annData?.announcements || []).length === 0 ? (
              <div className="empty-state"><Bell size={32} style={{ opacity: 0.3 }} /><p>No announcements</p></div>
            ) : (annData?.announcements || []).map(a => (
              <div key={a.id} style={{ display: 'flex', gap: 14, padding: 16, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, borderLeft: `3px solid ${a.is_active ? 'var(--accent-primary)' : 'var(--border-default)'}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{a.title}</span>
                    <span className={`badge ${a.is_active ? 'badge-green' : 'badge-gray'}`}>{a.is_active ? 'Active' : 'Off'}</span>
                    <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{a.target_role}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{a.content}</p>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>By {a.created_by_name || 'Admin'} · {new Date(a.created_at).toLocaleDateString()}</div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => delAnn.mutate(a.id)} style={{ padding: '5px 8px', flexShrink: 0 }}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'tokens' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 460, lineHeight: 1.6 }}>
              App tokens authenticate Electron app installations. Only requests with a valid token can access the API. Copy this token into your Electron app's <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 4 }}>.env</code> file.
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => createToken.mutate()} disabled={createToken.isPending}><Plus size={13} /> Generate</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(tokData?.tokens || []).map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: t.is_active ? 'var(--success-bg)' : 'var(--error-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Key size={14} style={{ color: t.is_active ? 'var(--success)' : 'var(--error)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)', display: 'block', marginBottom: 2 }}>{t.token}</code>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.platform} · {new Date(t.created_at).toLocaleDateString()}</div>
                </div>
                <span className={`badge ${t.is_active ? 'badge-green' : 'badge-red'}`}>{t.is_active ? 'Active' : 'Off'}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(t.token); toast.success('Copied!'); }} style={{ padding: '4px 7px' }}><Copy size={12} /></button>
                <button className="btn btn-secondary btn-sm" onClick={() => toggleToken.mutate(t.id)} style={{ padding: '4px 7px' }}><RefreshCw size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'categories' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button className="btn btn-primary" onClick={() => setShowCatForm(true)}><Plus size={13} /> Add Category</button>
          </div>
          {showCatForm && (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="input-group"><label className="input-label">Name *</label><input className="input" value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="grid-2">
                  <div className="input-group"><label className="input-label">Icon (emoji)</label><input className="input" value={catForm.icon} onChange={e => setCatForm(p => ({ ...p, icon: e.target.value }))} maxLength={2} style={{ fontSize: 20, textAlign: 'center' }} /></div>
                  <div className="input-group"><label className="input-label">Color</label><input type="color" className="input" value={catForm.color} onChange={e => setCatForm(p => ({ ...p, color: e.target.value }))} style={{ padding: 5, cursor: 'pointer' }} /></div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-secondary" onClick={() => setShowCatForm(false)} style={{ flex: 1 }}>Cancel</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} disabled={createCat.isPending || !catForm.name} onClick={() => createCat.mutate()}><Save size={13} /> Create</button>
                </div>
              </div>
            </div>
          )}
          <div className="grid-4">
            {(catData?.categories || []).map(c => (
              <div key={c.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '16px 18px', borderTop: `3px solid ${c.color}` }}>
                <div style={{ fontSize: 26, marginBottom: 8 }}>{c.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 3 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.lesson_count} lesson{c.lesson_count !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
