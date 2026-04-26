import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Eye, EyeOff, Video, FileText, X, Save, Link as LinkIcon, Upload, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

function LessonModal({ lesson, categories, teachers, onClose, onSaved }) {
  const isEdit = !!lesson?.id;
  const [tab, setTab] = useState('info');
  const [form, setForm] = useState({
    title: lesson?.title || '', description: lesson?.description || '',
    type: lesson?.type || 'lesson', categoryId: lesson?.category_id || '',
    teacherId: lesson?.teacher_id || '', isFree: lesson?.is_free === 1 || !lesson,
    price: lesson?.price || '', durationMinutes: lesson?.duration_minutes || '',
    difficulty: lesson?.difficulty || 'beginner', isPublished: lesson?.is_published === 1,
    isFeatured: lesson?.is_featured === 1, thumbnailUrl: lesson?.thumbnail_url || '',
    tags: Array.isArray(lesson?.tags) ? lesson.tags.join(', ') : (lesson?.tags || ''),
  });
  const [ytId, setYtId] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');

  const mutation = useMutation({
    mutationFn: (d) => isEdit ? api.put(`/lessons/${lesson.id}`, d) : api.post('/lessons', d),
    onSuccess: () => { toast.success(isEdit ? 'Updated!' : 'Created!'); onSaved(); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const videoMutation = useMutation({
    mutationFn: () => api.post('/video', { lessonId: lesson?.id, youtubeVideoId: ytId.replace(/.*(?:v=|\.be\/)([^&]+).*/,'$1') || ytId }),
    onSuccess: () => { toast.success('Video linked!'); setYtId(''); },
    onError: () => toast.error('Failed to link video'),
  });

  const pdfMutation = useMutation({
    mutationFn: () => api.post(`/lessons/${lesson?.id}/pdfs`, { title: pdfTitle, externalUrl: pdfUrl }),
    onSuccess: () => { toast.success('PDF added!'); setPdfTitle(''); setPdfUrl(''); },
    onError: () => toast.error('Failed'),
  });

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const setB = k => e => setForm(p => ({ ...p, [k]: e.target.checked }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? `Edit: ${lesson.title.slice(0,30)}` : 'New Lesson / Seminar'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 18, background: 'var(--bg-deep)', borderRadius: 10, padding: 4 }}>
          {[{ id: 'info', l: 'Info' }, { id: 'video', l: '🎬 Video', d: !isEdit }, { id: 'pdfs', l: '📄 PDFs', d: !isEdit }].map(t => (
            <button key={t.id} onClick={() => !t.d && setTab(t.id)} disabled={t.d}
              className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }}>{t.l}</button>
          ))}
        </div>

        {tab === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="grid-2">
              <div className="input-group"><label className="input-label">Type</label>
                <select className="input" value={form.type} onChange={set('type')}><option value="lesson">Lesson</option><option value="seminar">Seminar</option></select></div>
              <div className="input-group"><label className="input-label">Difficulty</label>
                <select className="input" value={form.difficulty} onChange={set('difficulty')}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
            </div>
            <div className="input-group"><label className="input-label">Title *</label><input className="input" value={form.title} onChange={set('title')} required /></div>
            <div className="input-group"><label className="input-label">Description</label><textarea className="input" rows={3} value={form.description} onChange={set('description')} style={{ resize: 'vertical' }} /></div>
            <div className="grid-2">
              <div className="input-group"><label className="input-label">Category</label>
                <select className="input" value={form.categoryId} onChange={set('categoryId')}><option value="">None</option>{(categories || []).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></div>
              <div className="input-group"><label className="input-label">Teacher</label>
                <select className="input" value={form.teacherId} onChange={set('teacherId')}><option value="">None</option>{(teachers || []).map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
            </div>
            <div className="grid-2">
              <div className="input-group"><label className="input-label">Duration (min)</label><input type="number" className="input" value={form.durationMinutes} onChange={set('durationMinutes')} /></div>
              <div className="input-group"><label className="input-label">Thumbnail URL</label><input className="input" value={form.thumbnailUrl} onChange={set('thumbnailUrl')} /></div>
            </div>
            <div className="input-group"><label className="input-label">Tags (comma separated)</label><input className="input" value={form.tags} onChange={set('tags')} /></div>
            <div style={{ background: 'var(--bg-deep)', borderRadius: 10, padding: '13px 14px', border: '1px solid var(--border-subtle)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: form.isFree ? 0 : 12 }}>
                <input type="checkbox" checked={form.isFree} onChange={setB('isFree')} />
                <span style={{ fontWeight: 600, fontSize: 13 }}>Free Lesson</span>
              </label>
              {!form.isFree && <div className="input-group" style={{ marginTop: 10 }}><label className="input-label">Price ($)</label><input type="number" className="input" value={form.price} onChange={set('price')} /></div>}
            </div>
            <div style={{ display: 'flex', gap: 18 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}><input type="checkbox" checked={form.isPublished} onChange={setB('isPublished')} /> Published</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}><input type="checkbox" checked={form.isFeatured} onChange={setB('isFeatured')} /> Featured</label>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={mutation.isPending}
                onClick={() => mutation.mutate({ ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [], price: form.isFree ? 0 : parseFloat(form.price) || 0, durationMinutes: parseInt(form.durationMinutes) || 0 })}>
                <Save size={13} /> {mutation.isPending ? 'Saving…' : isEdit ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        )}

        {tab === 'video' && isEdit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Paste a YouTube URL or video ID. The video ID will be AES-256 encrypted and only delivered to verified Electron app sessions.</p>
            <div className="input-group"><label className="input-label">YouTube URL or Video ID</label><input className="input" value={ytId} onChange={e => setYtId(e.target.value)} placeholder="https://youtube.com/watch?v=… or dQw4w9WgXcQ" /></div>
            {ytId && <div style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: '16/9', background: 'var(--bg-deep)' }}>
              <img src={`https://img.youtube.com/vi/${ytId.replace(/.*(?:v=|\.be\/)([^&]+).*/,'$1')||ytId}/maxresdefault.jpg`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
            </div>}
            <button className="btn btn-primary" disabled={!ytId || videoMutation.isPending} onClick={() => videoMutation.mutate()}>
              <Video size={13} /> {videoMutation.isPending ? 'Linking…' : 'Link Video'}
            </button>
          </div>
        )}

        {tab === 'pdfs' && isEdit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div className="input-group"><label className="input-label">PDF Title *</label><input className="input" value={pdfTitle} onChange={e => setPdfTitle(e.target.value)} placeholder="Course Notes Week 1" /></div>
            <div className="input-group"><label className="input-label">External URL</label>
              <div style={{ position: 'relative' }}>
                <LinkIcon size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="input" value={pdfUrl} onChange={e => setPdfUrl(e.target.value)} placeholder="https://drive.google.com/…" style={{ paddingLeft: 32 }} />
              </div>
            </div>
            <button className="btn btn-primary" disabled={!pdfTitle || !pdfUrl || pdfMutation.isPending} onClick={() => pdfMutation.mutate()}>
              <FileText size={13} /> {pdfMutation.isPending ? 'Adding…' : 'Add PDF'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LessonsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['web-lessons', search, typeFilter, page],
    queryFn: () => api.get('/lessons', { params: { type: typeFilter === 'all' ? undefined : typeFilter, search: search || undefined, page, limit: 12, sortBy: 'created_at', sortDir: 'DESC' } }).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: catData } = useQuery({ queryKey: ['web-cats'], queryFn: () => api.get('/admin/categories').then(r => r.data) });
  const { data: teachData } = useQuery({ queryKey: ['web-teach'], queryFn: () => api.get('/teachers').then(r => r.data) });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/lessons/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['web-lessons']); toast.success('Deleted'); },
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, isPublished }) => api.put(`/lessons/${id}`, { isPublished: !isPublished }),
    onSuccess: () => queryClient.invalidateQueries(['web-lessons']),
  });

  const lessons = data?.lessons || [];
  const pagination = data?.pagination || {};
  const categories = catData?.categories || [];
  const teachers = (teachData?.teachers || []).map(t => ({ id: t.id, first_name: t.first_name, last_name: t.last_name }));

  return (
    <div className="page" style={{ paddingBottom: 40 }}>
      <div className="page-header">
        <div><h1 className="page-title">📚 Lessons & Seminars</h1><p className="page-subtitle">{pagination.total || 0} total items</p></div>
        <button className="btn btn-primary" onClick={() => setModal({ data: null })}><Plus size={14} /> New</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 300 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input className="input" placeholder="Search…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: 34 }} />
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {[{ v: 'all', l: 'All' }, { v: 'lesson', l: '📘 Lessons' }, { v: 'seminar', l: '🎙 Seminars' }].map(({ v, l }) => (
            <button key={v} className={`btn btn-sm ${typeFilter === v ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setTypeFilter(v); setPage(1); }}>{l}</button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Title</th><th>Type</th><th>Category</th><th>Teacher</th><th>Price</th><th>Enrolled</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {isLoading ? [...Array(5)].map((_, i) => <tr key={i}><td colSpan={8}><div className="skeleton" style={{ height: 18 }} /></td></tr>)
              : lessons.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>No lessons found</td></tr>
              : lessons.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13, maxWidth: 160 }} className="truncate">{l.title}</td>
                  <td><span className={`badge ${l.type === 'seminar' ? 'badge-cyan' : 'badge-purple'}`} style={{ textTransform: 'capitalize' }}>{l.type}</span></td>
                  <td style={{ fontSize: 12 }}>{l.category_name ? `${l.category_icon || ''} ${l.category_name}` : '—'}</td>
                  <td style={{ fontSize: 12 }}>{l.teacher_name || '—'}</td>
                  <td><span className={`badge ${l.is_free ? 'badge-green' : 'badge-amber'}`}>{l.is_free ? 'Free' : `$${l.price}`}</span></td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{l.enrollment_count || 0}</td>
                  <td><span className={`badge ${l.is_published ? 'badge-green' : 'badge-gray'}`}>{l.is_published ? 'Live' : 'Draft'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setModal({ data: l })} style={{ padding: '4px 7px' }}><Edit size={12} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => togglePublish.mutate({ id: l.id, isPublished: l.is_published })} style={{ padding: '4px 7px' }}>{l.is_published ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                      <button className="btn btn-danger btn-sm" onClick={() => { if (window.confirm(`Delete "${l.title}"?`)) deleteMutation.mutate(l.id); }} style={{ padding: '4px 7px' }}><Trash2 size={12} /></button>
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

      {modal && <LessonModal lesson={modal.data} categories={categories} teachers={teachers} onClose={() => setModal(null)} onSaved={() => { setModal(null); queryClient.invalidateQueries(['web-lessons']); }} />}
    </div>
  );
}
