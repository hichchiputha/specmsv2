import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play, Clock, Users, Lock, CheckCircle, Download,
  Star, BookOpen, ArrowLeft, FileText, AlertCircle
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function LessonDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: lesson, isLoading } = useQuery({
    queryKey: ['lesson', id],
    queryFn: () => api.get(`/lessons/${id}`).then(r => r.data),
  });

  const enrollMutation = useMutation({
    mutationFn: () => api.post('/enrollments', { lessonId: id }),
    onSuccess: () => {
      toast.success('Enrolled successfully! You can now watch this lesson.');
      queryClient.invalidateQueries(['lesson', id]);
      queryClient.invalidateQueries(['enrollments']);
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Enrollment failed';
      const code = err.response?.data?.code;
      if (code === 'PAID_LESSON') {
        toast.error('This is a paid lesson. Please contact your admin to enroll.', { duration: 6000 });
      } else {
        toast.error(msg);
      }
    },
  });

  if (isLoading) return (
    <div className="page">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 40, borderRadius: 8, width: '60%' }} />
        <div className="skeleton" style={{ height: 100, borderRadius: 8 }} />
      </div>
    </div>
  );

  if (!lesson) return (
    <div className="page"><div className="empty-state"><h3>Lesson not found</h3></div></div>
  );

  const isFree = lesson.is_free === 1 || lesson.is_free === true;
  const isEnrolled = !!lesson.my_enrollment_status;
  const progress = lesson.myProgress || 0;
  const type = lesson.type || 'lesson';
  const base = type === 'seminar' ? '/seminars' : '/lessons';

  return (
    <div className="page" style={{ paddingBottom: 48 }}>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 24 }}>
        <ArrowLeft size={15} /> Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32, alignItems: 'start' }}>
        {/* Left - Main content */}
        <div>
          {/* Thumbnail */}
          <div style={{
            borderRadius: 20, overflow: 'hidden', marginBottom: 28,
            aspectRatio: '16/9', background: 'var(--bg-elevated)', position: 'relative',
          }}>
            {lesson.thumbnail_url
              ? <img src={lesson.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (
                <div style={{
                  width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `linear-gradient(135deg, ${lesson.category_color || '#7c3aed'}22, ${lesson.category_color || '#06b6d4'}11)`,
                }}>
                  <Play size={64} style={{ color: lesson.category_color || 'var(--accent-primary)', opacity: 0.4 }} />
                </div>
              )
            }
            {isEnrolled && (
              <div style={{
                position: 'absolute', bottom: 16, left: 16, right: 16,
              }}>
                <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: '8px 12px', backdropFilter: 'blur(8px)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'white' }}>
                    <span>Your progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Category + Type */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {lesson.category_name && (
              <span className="badge badge-purple">
                {lesson.category_icon} {lesson.category_name}
              </span>
            )}
            <span className={`badge ${type === 'seminar' ? 'badge-cyan' : 'badge-purple'}`}>
              {type === 'seminar' ? '🎙 Seminar' : '📘 Lesson'}
            </span>
            <span className={`badge ${isFree ? 'badge-green' : 'badge-amber'}`}>
              {isFree ? '✓ Free' : '🔒 Paid'}
            </span>
            {lesson.difficulty && (
              <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>
                {lesson.difficulty}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 16, lineHeight: 1.3 }}>
            {lesson.title}
          </h1>

          {/* Teacher */}
          {lesson.teacher_name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0,
              }}>
                {lesson.teacher_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{lesson.teacher_name}</div>
                {lesson.expertise && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lesson.expertise}</div>}
              </div>
              {lesson.teacher_rating > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', fontSize: 13, color: 'var(--warning)' }}>
                  <Star size={13} fill="currentColor" /> {lesson.teacher_rating.toFixed(1)}
                </div>
              )}
            </div>
          )}

          {/* Meta */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
            {lesson.duration_minutes > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                <Clock size={14} /> {lesson.duration_minutes} minutes
              </span>
            )}
            {lesson.enrollment_count > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                <Users size={14} /> {lesson.enrollment_count} enrolled
              </span>
            )}
          </div>

          {/* Description */}
          {lesson.description && (
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
              borderRadius: 14, padding: 20, marginBottom: 24,
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>About this lesson</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{lesson.description}</p>
            </div>
          )}

          {/* PDFs */}
          {lesson.pdfs?.length > 0 && (
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
              borderRadius: 14, padding: 20,
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} /> Resources & PDFs ({lesson.pdfs.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {lesson.pdfs.map(pdf => (
                  <div
                    key={pdf.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', background: 'var(--bg-elevated)',
                      borderRadius: 10, border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <FileText size={16} style={{ color: '#ef4444' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {pdf.title}
                      </div>
                      {pdf.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pdf.description}</div>
                      )}
                    </div>
                    {isEnrolled && pdf.is_downloadable && (pdf.file_url || pdf.external_url) && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => window.electron?.openExternal(pdf.external_url || `http://localhost:3001${pdf.file_url}`)}
                      >
                        <Download size={12} /> Download
                      </button>
                    )}
                  </div>
                ))}
                {!isEnrolled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', padding: '8px 4px' }}>
                    <Lock size={12} /> Enroll to access PDFs and resources
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right - Enrollment card */}
        <div style={{ position: 'sticky', top: 0 }}>
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
              borderRadius: 20, padding: 24,
            }}
          >
            {isEnrolled ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', marginBottom: 16, fontSize: 14, fontWeight: 600 }}>
                  <CheckCircle size={18} /> You're enrolled
                </div>
                {progress >= 90 && (
                  <div style={{
                    padding: '10px 14px', background: 'var(--success-bg)', borderRadius: 10, marginBottom: 16, fontSize: 13, color: 'var(--success)',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <CheckCircle size={14} /> Lesson completed! 🎉
                  </div>
                )}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                    <span>Progress</span><span>{Math.round(progress)}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: 6 }}>
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                {lesson.hasVideo && (
                  <button
                    className="btn btn-primary btn-full btn-lg"
                    onClick={() => navigate(`${base}/${lesson.id}/watch`)}
                  >
                    <Play size={18} /> {progress > 0 ? 'Continue Watching' : 'Start Lesson'}
                  </button>
                )}
              </>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 4 }}>
                    {isFree ? '🆓 Free' : `💳 Paid`}
                  </div>
                  {!isFree && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      Contact admin to enroll in this premium lesson
                    </div>
                  )}
                </div>

                {isFree ? (
                  <button
                    className="btn btn-primary btn-full btn-lg"
                    onClick={() => enrollMutation.mutate()}
                    disabled={enrollMutation.isPending}
                  >
                    {enrollMutation.isPending ? 'Enrolling...' : '✓ Enroll for Free'}
                  </button>
                ) : (
                  <div style={{
                    padding: '16px', background: 'var(--warning-bg)',
                    borderRadius: 12, border: '1px solid rgba(245,158,11,0.2)',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}>
                    <AlertCircle size={16} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      This is a paid lesson. Please <strong style={{ color: 'var(--warning)' }}>contact your administrator</strong> to get enrolled.
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                  {lesson.enrollment_count} student{lesson.enrollment_count !== 1 ? 's' : ''} enrolled
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
