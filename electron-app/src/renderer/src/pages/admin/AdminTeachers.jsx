import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Edit, Award, X, Save, Search, Camera, Link as LinkIcon, Upload } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

function TeacherModal({ teacher, onClose, onSaved }) {
  const [form, setForm] = useState({
    expertise: teacher?.expertise || '',
    qualifications: teacher?.qualifications || '',
    yearsExperience: teacher?.years_experience || '',
    isFeatured: teacher?.is_featured === 1,
  });
  const [avatarTab, setAvatarTab] = useState('upload'); // 'upload' | 'url'
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(teacher?.avatar_url || null);
  const fileRef = useRef();

  const mutation = useMutation({
    mutationFn: () => api.put(`/admin/teachers/${teacher.id}`, form),
    onSuccess: () => { toast.success('Teacher updated!'); onSaved(); },
    onError: () => toast.error('Update failed'),
  });

  const avatarUploadMutation = useMutation({
    mutationFn: async () => {
      if (avatarFile) {
        const fd = new FormData();
        fd.append('avatar', avatarFile);
        return api.post(`/admin/teachers/${teacher.id}/avatar`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else if (avatarUrl) {
        return api.put(`/admin/teachers/${teacher.id}/avatar-url`, { avatarUrl });
      }
    },
    onSuccess: (res) => {
      toast.success('Profile picture updated!');
      setAvatarPreview(res?.data?.avatarUrl || avatarUrl);
      setAvatarFile(null);
    },
    onError: () => toast.error('Failed to update profile picture'),
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const apiBase = 'http://localhost:3001';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Teacher: {teacher.first_name} {teacher.last_name}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Profile Picture Section */}
        <div style={{
          background: 'var(--bg-deep)', borderRadius: 14, padding: 20, marginBottom: 20,
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Camera size={14} /> Profile Picture
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {/* Preview */}
            <div style={{
              width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
              background: avatarPreview
                ? 'transparent'
                : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 700, color: 'white',
              overflow: 'hidden', border: '3px solid var(--border-default)',
            }}>
              {avatarPreview ? (
                <img
                  src={avatarPreview.startsWith('http') || avatarPreview.startsWith('data:')
                    ? avatarPreview
                    : `${apiBase}${avatarPreview}`}
                  alt="avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              ) : (
                `${teacher.first_name?.[0] || ''}${teacher.last_name?.[0] || ''}`
              )}
            </div>

            <div style={{ flex: 1 }}>
              {/* Tab switcher */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                <button
                  onClick={() => setAvatarTab('upload')}
                  className={`btn btn-sm ${avatarTab === 'upload' ? 'btn-primary' : 'btn-ghost'}`}
                >
                  <Upload size={12} /> Upload File
                </button>
                <button
                  onClick={() => setAvatarTab('url')}
                  className={`btn btn-sm ${avatarTab === 'url' ? 'btn-primary' : 'btn-ghost'}`}
                >
                  <LinkIcon size={12} /> Image URL
                </button>
              </div>

              {avatarTab === 'upload' ? (
                <div>
                  <input
                    ref={fileRef} type="file" accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => fileRef.current?.click()}
                    style={{ marginBottom: 8 }}
                  >
                    <Camera size={13} /> Choose Image
                  </button>
                  {avatarFile && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{avatarFile.name}</div>
                  )}
                </div>
              ) : (
                <input
                  className="input"
                  value={avatarUrl}
                  onChange={e => {
                    setAvatarUrl(e.target.value);
                    if (e.target.value) setAvatarPreview(e.target.value);
                  }}
                  placeholder="https://example.com/photo.jpg"
                  style={{ fontSize: 12, userSelect: 'text' }}
                />
              )}

              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: 8 }}
                disabled={(!avatarFile && !avatarUrl) || avatarUploadMutation.isPending}
                onClick={() => avatarUploadMutation.mutate()}
              >
                {avatarUploadMutation.isPending ? 'Saving…' : 'Save Picture'}
              </button>
            </div>
          </div>
        </div>

        {/* Teacher Info Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="input-group">
            <label className="input-label">Expertise</label>
            <input className="input" value={form.expertise} onChange={set('expertise')} placeholder="e.g. Python, Machine Learning" style={{ userSelect: 'text' }} />
          </div>
          <div className="input-group">
            <label className="input-label">Qualifications</label>
            <textarea className="input" rows={2} value={form.qualifications} onChange={set('qualifications')} placeholder="e.g. MSc Computer Science, MIT" style={{ resize: 'vertical', userSelect: 'text' }} />
          </div>
          <div className="input-group">
            <label className="input-label">Years of Experience</label>
            <input type="number" className="input" value={form.yearsExperience} onChange={set('yearsExperience')} placeholder="5" style={{ userSelect: 'text' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={form.isFeatured} onChange={e => setForm(p => ({ ...p, isFeatured: e.target.checked }))} />
            <Award size={14} /> Featured Teacher (shown prominently on homepage)
          </label>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              <Save size={14} /> {mutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminTeachers() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-teachers'],
    queryFn: () => api.get('/admin/teachers').then(r => r.data),
  });

  const teachers = (data?.teachers || []).filter(t =>
    !search || `${t.first_name} ${t.last_name} ${t.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const apiBase = 'http://localhost:3001';

  return (
    <div className="page" style={{ paddingBottom: 40 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">🎓 Teachers</h1>
          <p className="page-subtitle">{teachers.length} teachers registered</p>
        </div>
      </div>

      <div style={{ position: 'relative', maxWidth: 320, marginBottom: 20 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input className="input" placeholder="Search teachers…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36, userSelect: 'text' }} />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Teacher</th>
              <th>Expertise</th>
              <th>Experience</th>
              <th>Lessons</th>
              <th>Rating</th>
              <th>Featured</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i}><td colSpan={8}><div className="skeleton" style={{ height: 20, borderRadius: 4 }} /></td></tr>
              ))
            ) : teachers.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                {search ? 'No teachers match your search' : 'No teachers yet. Create a user with the Teacher role.'}
              </td></tr>
            ) : teachers.map(t => (
              <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: t.avatar_url
                        ? 'transparent'
                        : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: 'white',
                      overflow: 'hidden', border: '2px solid var(--border-default)',
                    }}>
                      {t.avatar_url ? (
                        <img
                          src={t.avatar_url.startsWith('http') ? t.avatar_url : `${apiBase}${t.avatar_url}`}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        `${t.first_name?.[0] || ''}${t.last_name?.[0] || ''}`
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                        {t.first_name} {t.last_name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: 12, maxWidth: 160 }} className="truncate">{t.expertise || '—'}</td>
                <td style={{ fontSize: 12 }}>{t.years_experience ? `${t.years_experience} yrs` : '—'}</td>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.lesson_count}</td>
                <td>
                  {t.rating > 0 ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--warning)' }}>
                      <Star size={11} fill="currentColor" /> {t.rating.toFixed(1)}
                    </span>
                  ) : '—'}
                </td>
                <td>
                  {t.is_featured
                    ? <span className="badge badge-amber"><Award size={9} /> Featured</span>
                    : <span className="badge badge-gray">No</span>}
                </td>
                <td>
                  <span className={`badge ${t.is_active ? 'badge-green' : 'badge-red'}`}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setModal(t)}
                    style={{ padding: '5px 8px' }}
                    title="Edit teacher"
                  >
                    <Edit size={13} />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {modal && (
          <TeacherModal
            teacher={modal}
            onClose={() => setModal(null)}
            onSaved={() => {
              setModal(null);
              queryClient.invalidateQueries(['admin-teachers']);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
