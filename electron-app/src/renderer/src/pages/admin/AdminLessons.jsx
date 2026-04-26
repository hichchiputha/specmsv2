import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Edit, Trash2, Eye, EyeOff, Video, FileText,
  X, Save, Upload, Link as LinkIcon, Search, Filter
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const TYPES = ['lesson', 'seminar'];

function LessonModal({ lesson, categories, teachers, onClose, onSaved }) {
  const isEdit = !!lesson?.id;
  const [form, setForm] = useState({
    title: lesson?.title || '',
    description: lesson?.description || '',
    type: lesson?.type || 'lesson',
    categoryId: lesson?.category_id || '',
    teacherId: lesson?.teacher_id || '',
    isFree: lesson?.is_free === 1 || !lesson,
    price: lesson?.price || '',
    durationMinutes: lesson?.duration_minutes || '',
    difficulty: lesson?.difficulty || 'beginner',
    isPublished: lesson?.is_published === 1,
    isFeatured: lesson?.is_featured === 1,
    thumbnailUrl: lesson?.thumbnail_url || '',
    tags: lesson?.tags ? (Array.isArray(lesson.tags) ? lesson.tags.join(', ') : lesson.tags) : '',
  });
  const [youtubeId, setYoutubeId] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const fileRef = useRef();

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? api.put(`/lessons/${lesson.id}`, data)
      : api.post('/lessons', data),
    onSuccess: () => { toast.success(isEdit ? 'Lesson updated!' : 'Lesson created!'); onSaved(); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const videoMutation = useMutation({
    mutationFn: () => api.post('/video', { lessonId: lesson?.id, youtubeVideoId: youtubeId }),
    onSuccess: () => { toast.success('Video linked!'); setYoutubeId(''); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const pdfMutation = useMutation({
    mutationFn: async () => {
      let fileUrl = null;
      if (pdfFile) {
        const fd = new FormData();
        fd.append('file', pdfFile);
        const r = await api.post('/admin/upload-pdf', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        fileUrl = r.data.fileUrl;
      }
      return api.post(`/lessons/${lesson?.id}/pdfs`, {
        title: pdfTitle,
        fileUrl,
        externalUrl: !pdfFile ? pdfUrl : null,
      });
    },
    onSuccess: () => { toast.success('PDF added!'); setPdfTitle(''); setPdfUrl(''); setPdfFile(null); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const setB = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.checked }));

  const handleSave = () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    mutation.mutate({
      ...form,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      price: form.isFree ? 0 : parseFloat(form.price) || 0,
      durationMinutes: parseInt(form.durationMinutes) || 0,
    });
  };

  const extractYTId = (val) => {
    const m = val.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return m ? m[1] : val;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? `Edit: ${lesson.title}` : 'Create Lesson / Seminar'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-deep)', borderRadius: 10, padding: 4 }}>
          {[
            { id: 'info', label: 'Info' },
            { id: 'video', label: '🎬 Video', disabled: !isEdit },
            { id: 'pdfs', label: '📄 PDFs', disabled: !isEdit },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => !t.disabled && setActiveTab(t.id)}
              className={`btn btn-sm ${activeTab === t.id ? 'btn-primary' : 'btn-ghost'}`}
              disabled={t.disabled}
              style={{ flex: 1 }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">Type</label>
                <select className="input" value={form.type} onChange={set('type')}>
                  {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Difficulty</label>
                <select className="input" value={form.difficulty} onChange={set('difficulty')}>
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                </select>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Title *</label>
              <input className="input" value={form.title} onChange={set('title')} placeholder="e.g. Introduction to Python" required style={{ userSelect: 'text' }} />
            </div>

            <div className="input-group">
              <label className="input-label">Description</label>
              <textarea className="input" rows={3} value={form.description} onChange={set('description')} placeholder="Describe what students will learn…" style={{ resize: 'vertical', userSelect: 'text' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">Category</label>
                <select className="input" value={form.categoryId} onChange={set('categoryId')}>
                  <option value="">No category</option>
                  {(categories || []).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Teacher</label>
                <select className="input" value={form.teacherId} onChange={set('teacherId')}>
                  <option value="">No teacher</option>
                  {(teachers || []).map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">Duration (minutes)</label>
                <input type="number" className="input" value={form.durationMinutes} onChange={set('durationMinutes')} placeholder="60" style={{ userSelect: 'text' }} />
              </div>
              <div className="input-group">
                <label className="input-label">Thumbnail URL</label>
                <input className="input" value={form.thumbnailUrl} onChange={set('thumbnailUrl')} placeholder="https://…" style={{ userSelect: 'text' }} />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Tags (comma separated)</label>
              <input className="input" value={form.tags} onChange={set('tags')} placeholder="python, beginner, programming" style={{ userSelect: 'text' }} />
            </div>

            {/* Pricing */}
            <div style={{
              background: 'var(--bg-deep)', borderRadius: 12, padding: '14px 16px',
              border: '1px solid var(--border-subtle)',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: form.isFree ? 0 : 12 }}>
                <input type="checkbox" checked={form.isFree} onChange={setB('isFree')} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Free Lesson</span>
              </label>
              {!form.isFree && (
                <div className="input-group" style={{ marginTop: 10 }}>
                  <label className="input-label">Price ($)</label>
                  <input type="number" className="input" value={form.price} onChange={set('price')} placeholder="29.99" style={{ userSelect: 'text' }} />
                </div>
              )}
            </div>

            {/* Toggles */}
            <div style={{ display: 'flex', gap: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={form.isPublished} onChange={setB('isPublished')} />
                Published
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={form.isFeatured} onChange={setB('isFeatured')} />
                Featured
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={mutation.isPending} onClick={handleSave}>
                <Save size={14} /> {mutation.isPending ? 'Saving…' : isEdit ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'video' && isEdit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Paste a YouTube video URL or video ID. The video will be encrypted and only playable inside the Electron app by enrolled users.
            </p>
            <div className="input-group">
              <label className="input-label">YouTube URL or Video ID</label>
              <input
                className="input"
                value={youtubeId}
                onChange={e => setYoutubeId(extractYTId(e.target.value))}
                placeholder="https://youtube.com/watch?v=… or dQw4w9WgXcQ"
                style={{ userSelect: 'text' }}
              />
            </div>
            {youtubeId && (
              <div style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: '16/9', background: 'var(--bg-deep)' }}>
                <img
                  src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
                  alt="thumbnail"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => e.target.style.display = 'none'}
                />
              </div>
            )}
            <button className="btn btn-primary" disabled={!youtubeId || videoMutation.isPending} onClick={() => videoMutation.mutate()}>
              <Video size={14} /> {videoMutation.isPending ? 'Linking…' : 'Link Video'}
            </button>
          </div>
        )}

        {activeTab === 'pdfs' && isEdit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Upload a PDF/document file or provide a direct URL.</p>
            <div className="input-group">
              <label className="input-label">PDF Title *</label>
              <input className="input" value={pdfTitle} onChange={e => setPdfTitle(e.target.value)} placeholder="e.g. Course Notes Week 1" style={{ userSelect: 'text' }} />
            </div>

            <div style={{
              border: '2px dashed var(--border-default)', borderRadius: 12, padding: 20, textAlign: 'center',
              cursor: 'pointer', transition: 'border-color 0.2s',
            }}
              onClick={() => fileRef.current?.click()}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
            >
              <Upload size={24} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {pdfFile ? pdfFile.name : 'Click to upload PDF/DOC/PPT (max 50MB)'}
              </p>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" style={{ display: 'none' }} onChange={e => setPdfFile(e.target.files[0])} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            </div>

            <div className="input-group">
              <label className="input-label">External URL</label>
              <div style={{ position: 'relative' }}>
                <LinkIcon size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="input" value={pdfUrl} onChange={e => setPdfUrl(e.target.value)} placeholder="https://drive.google.com/…" style={{ paddingLeft: 34, userSelect: 'text' }} />
              </div>
            </div>

            <button
              className="btn btn-primary"
              disabled={!pdfTitle || (!pdfFile && !pdfUrl) || pdfMutation.isPending}
              onClick={() => pdfMutation.mutate()}
            >
              <FileText size={14} /> {pdfMutation.isPending ? 'Adding…' : 'Add PDF'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminLessons() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-lessons', search, typeFilter, page],
    queryFn: () => api.get('/lessons', {
      params: {
        type: typeFilter === 'all' ? undefined : typeFilter,
        search: search || undefined,
        page, limit: 12,
        sortBy: 'created_at', sortDir: 'DESC',
      },
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api.get('/admin/categories').then(r => r.data),
  });

  const { data: teachersData } = useQuery({
    queryKey: ['admin-teachers-list'],
    queryFn: () => api.get('/teachers').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/lessons/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['admin-lessons']); toast.success('Lesson deleted'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Delete failed'),
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, isPublished }) => api.put(`/lessons/${id}`, { isPublished: !isPublished }),
    onSuccess: () => queryClient.invalidateQueries(['admin-lessons']),
  });

  const lessons = data?.lessons || [];
  const pagination = data?.pagination || {};
  const categories = categoriesData?.categories || [];
  const teachersList = (teachersData?.teachers || []).map(t => ({
    id: t.id,
    first_name: t.first_name,
    last_name: t.last_name,
  }));

  return (
    <div className="page" style={{ paddingBottom: 40 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">📚 Lesson Management</h1>
          <p className="page-subtitle">{pagination.total || 0} total items</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ data: null })}>
          <Plus size={15} /> New Lesson
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 320 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input className="input" placeholder="Search lessons…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: 36, userSelect: 'text' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{ v: 'all', l: 'All' }, { v: 'lesson', l: '📘 Lessons' }, { v: 'seminar', l: '🎙 Seminars' }].map(({ v, l }) => (
            <button key={v} className={`btn btn-sm ${typeFilter === v ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setTypeFilter(v); setPage(1); }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Category</th>
              <th>Teacher</th>
              <th>Price</th>
              <th>Enrolled</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={8}><div className="skeleton" style={{ height: 20, borderRadius: 4 }} /></td></tr>
              ))
            ) : lessons.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No lessons found</td></tr>
            ) : lessons.map(l => (
              <tr key={l.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 40, height: 28, borderRadius: 6, flexShrink: 0, overflow: 'hidden',
                      background: `${l.category_color || 'var(--accent-primary)'}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {l.thumbnail_url
                        ? <img src={l.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 14 }}>{l.type === 'seminar' ? '🎙' : '📘'}</span>
                      }
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }} className="truncate">{l.title}</span>
                  </div>
                </td>
                <td>
                  <span className={`badge ${l.type === 'seminar' ? 'badge-cyan' : 'badge-purple'}`} style={{ textTransform: 'capitalize' }}>
                    {l.type}
                  </span>
                </td>
                <td style={{ fontSize: 12 }}>
                  {l.category_name ? `${l.category_icon || ''} ${l.category_name}` : '—'}
                </td>
                <td style={{ fontSize: 12 }}>{l.teacher_name || '—'}</td>
                <td>
                  <span className={`badge ${l.is_free ? 'badge-green' : 'badge-amber'}`}>
                    {l.is_free ? 'Free' : `$${l.price}`}
                  </span>
                </td>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{l.enrollment_count || 0}</td>
                <td>
                  <span className={`badge ${l.is_published ? 'badge-green' : 'badge-gray'}`}>
                    {l.is_published ? 'Live' : 'Draft'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => setModal({ data: l })} style={{ padding: '5px 8px' }}>
                      <Edit size={13} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      title={l.is_published ? 'Unpublish' : 'Publish'}
                      onClick={() => togglePublish.mutate({ id: l.id, isPublished: l.is_published })}
                      style={{ padding: '5px 8px' }}
                    >
                      {l.is_published ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      title="Delete"
                      onClick={() => { if (window.confirm(`Delete "${l.title}"?`)) deleteMutation.mutate(l.id); }}
                      style={{ padding: '5px 8px' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 }}>
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Page {page} / {pagination.totalPages}</span>
          <button className="btn btn-secondary btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <LessonModal
            lesson={modal.data}
            categories={categories}
            teachers={teachersList}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); queryClient.invalidateQueries(['admin-lessons']); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
