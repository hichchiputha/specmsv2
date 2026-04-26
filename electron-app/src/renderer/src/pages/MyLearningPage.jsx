import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Play, CheckCircle, Clock, BookMarked } from 'lucide-react';
import api from '../utils/api';
import { motion } from 'framer-motion';

function EnrolledCard({ enrollment }) {
  const navigate = useNavigate();
  const progress = enrollment.progress || 0;
  const isCompleted = enrollment.enrollment_status === 'completed' || progress >= 90;
  const base = enrollment.type === 'seminar' ? '/seminars' : '/lessons';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
      style={{ display: 'flex', gap: 16, padding: 16, cursor: 'pointer' }}
      onClick={() => navigate(`${base}/${enrollment.lesson_id}/watch`)}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
    >
      {/* Thumbnail */}
      <div style={{ width: 100, height: 70, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-elevated)', position: 'relative' }}>
        {enrollment.thumbnail_url
          ? <img src={enrollment.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
              {enrollment.type === 'seminar' ? '🎙' : '📘'}
            </div>
        }
        {isCompleted && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(16,185,129,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={24} color="white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <h4 className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {enrollment.title}
          </h4>
          <span className={`badge ${isCompleted ? 'badge-green' : 'badge-purple'}`} style={{ flexShrink: 0 }}>
            {isCompleted ? 'Done' : 'Active'}
          </span>
        </div>

        {enrollment.teacher_name && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>by {enrollment.teacher_name}</div>
        )}

        <div style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{Math.round(progress)}% complete</span>
            {enrollment.last_watched_at && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={10} /> {new Date(enrollment.last_watched_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={e => { e.stopPropagation(); navigate(`${base}/${enrollment.lesson_id}/watch`); }}
          >
            <Play size={12} /> {progress > 0 ? 'Continue' : 'Start'}
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={e => { e.stopPropagation(); navigate(`${base}/${enrollment.lesson_id}`); }}
          >
            Details
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function MyLearningPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => api.get('/enrollments').then(r => r.data),
  });

  const enrollments = data?.enrollments || [];
  const active = enrollments.filter(e => e.status === 'active');
  const completed = enrollments.filter(e => e.status === 'completed');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title"><BookMarked size={28} style={{ display: 'inline', marginRight: 10, verticalAlign: 'middle' }} />My Learning</h1>
          <p className="page-subtitle">{enrollments.length} enrolled lesson{enrollments.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 14 }} />)}
        </div>
      ) : enrollments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <h3>No lessons enrolled yet</h3>
          <p className="text-muted">Browse lessons and enroll to start learning</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Play size={18} style={{ color: 'var(--accent-primary)' }} /> In Progress ({active.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {active.map(e => <EnrolledCard key={e.id} enrollment={e} />)}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={18} style={{ color: 'var(--success)' }} /> Completed ({completed.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {completed.map(e => <EnrolledCard key={e.id} enrollment={e} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
