import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, Star, Award, X, Save, Search, Camera, Upload, Link as LinkIcon } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

function TeacherModal({ teacher, onClose, onSaved }) {
  const [form, setForm] = useState({
    expertise: teacher?.expertise || '',
    qualifications: teacher?.qualifications || '',
    yearsExperience: teacher?.years_experience || '',
    isFeatured: teacher?.is_featured === 1,
  });
  const [avatarTab, setAvatarTab] = useState('upload');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(teacher?.avatar_url || null);
  const fileRef = useRef();

  const mutation = useMutation({
    mutationFn: () => api.put(`/admin/teachers/${teacher.id}`, form),
    onSuccess: () => { toast.success('Updated!'); onSaved(); },
    onError: () => toast.error('Update failed'),
  });

  const avatarMutation = useMutation({
    mutationFn: async () => {
      if (avatarFile) {
        const fd = new FormData();
        fd.append('avatar', avatarFile);
        return api.post(`/admin/teachers/${teacher.id}/avatar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else if (avatarUrl) {
        return api.put(`/admin/teachers/${teacher.id}/avatar-url`, { avatarUrl });
      }
    },
    onSuccess: (res) => {
      toast.success('Picture updated!');
      setAvatarPreview(res?.data?.avatarUrl || avatarUrl);
      setAvatarFile(null);
    },
    onError: () => toast.error('Failed to update picture'),
  });

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit: {teacher.first_name} {teacher.last_name}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>

        {/* Avatar Section */}
        <div style={{ background: 'var(--bg-deep)', borderRadius: 12, padding: 16, marginBottom: 18, border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Camera size={13} /> Profile Picture
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
              background: avatarPreview ? 'transparent' : 'linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 700, color: 'white',
              overflow: 'hidden', border: '3px solid var(--border-default)',
            }}>
              {avatarPreview
                ? <img src={avatarPreview.startsWith('http') || avatarPreview.startsWith('data:') ? avatarPreview : `http://localhost:3001${avatarPreview}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
                : `${teacher.first_name?.[0]||''}${teacher.last_name?.[0]||''}`
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                <button onClick={() => setAvatarTab('upload')} className={`btn btn-sm ${avatarTab === 'upload' ? 'btn-primary' : 'btn-ghost'}`}><Upload size={11} /> File</button>
                <button onClick={() => setAvatarTab('url')} className={`btn btn-sm ${avatarTab === 'url' ? 'btn-primary' : 'btn-ghost'}`}><LinkIcon size={11} /> URL</button>
              </div>
              {avatarTab === 'upload' ? (
                <div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
                  <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} style={{ marginBottom: 6 }}><Camera size={12} /> Choose Image</button>
                  {avatarFile && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{avatarFile.name}</div>}
                </div>
              ) : (
                <input className="input" value={avatarUrl} onChange={e => { setAvatarUrl(e.target.value); if (e.target.value) setAvatarPreview(e.target.value); }} placeholder="https://example.com/photo.jpg" style={{ fontSize: 12 }} />
              )}
              <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} disabled={(!avatarFile && !avatarUrl) || avatarMutation.isPending} onClick={() => avatarMutation.mutate()}>
                {avatarMutation.isPending ? 'Saving…' : 'Save Picture'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div className="input-group"><label className="input-label">Expertise</label><input className="input" value={form.expertise} onChange={set('expertise')} placeholder="e.g. Python, Machine Learning" /></div>
          <div className="input-group"><label className="input-label">Qualifications</label><textarea className="input" rows={2} value={form.qualifications} onChange={set('qualifications')} style={{ resize: 'vertical' }} /></div>
          <div className="input-group"><label className="input-label">Years of Experience</label><input type="number" className="input" value={form.yearsExperience} onChange={set('yearsExperience')} /></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={form.isFeatured} onChange={e => setForm(p => ({ ...p, isFeatured: e.target.checked }))} />
            <Award size={13} /> Featured Teacher
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              <Save size={13} /> {mutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeachersPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['web-teachers'], queryFn: () => api.get('/admin/teachers').then(r => r.data) });
  const teachers = (data?.teachers || []).filter(t =>
    !search || `${t.first_name} ${t.last_name} ${t.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page" style={{ paddingBottom: 40 }}>
      <div className="page-header">
        <div><h1 className="page-title">🎓 Teachers</h1><p className="page-subtitle">{teachers.length} teachers</p></div>
      </div>
      <div style={{ position: 'relative', maxWidth: 300, marginBottom: 18 }}>
        <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input className="input" placeholder="Search teachers…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34 }} />
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Teacher</th><th>Expertise</th><th>Experience</th><th>Lessons</th><th>Rating</th><th>Featured</th><th>Actions</th></tr></thead>
          <tbody>
            {isLoading ? [...Array(4)].map((_, i) => <tr key={i}><td colSpan={7}><div className="skeleton" style={{ height: 18 }} /></td></tr>)
              : teachers.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>No teachers found</td></tr>
              : teachers.map(t => (
                <tr key={t.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: t.avatar_url ? 'transparent' : 'linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', overflow: 'hidden', border: '2px solid var(--border-default)', flexShrink: 0 }}>
                        {t.avatar_url
                          ? <img src={t.avatar_url.startsWith('http') ? t.avatar_url : `http://localhost:3001${t.avatar_url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
                          : `${t.first_name?.[0]||''}${t.last_name?.[0]||''}`
                        }
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{t.first_name} {t.last_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, maxWidth: 150 }} className="truncate">{t.expertise || '—'}</td>
                  <td style={{ fontSize: 12 }}>{t.years_experience ? `${t.years_experience} yrs` : '—'}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.lesson_count}</td>
                  <td>{t.rating > 0 ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--warning)' }}><Star size={11} fill="currentColor" /> {t.rating.toFixed(1)}</span> : '—'}</td>
                  <td>{t.is_featured ? <span className="badge badge-amber"><Award size={9} /> Yes</span> : <span className="badge badge-gray">No</span>}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => setModal(t)} style={{ padding: '4px 7px' }}><Edit size={12} /></button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {modal && <TeacherModal teacher={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); queryClient.invalidateQueries(['web-teachers']); }} />}
    </div>
  );
}
