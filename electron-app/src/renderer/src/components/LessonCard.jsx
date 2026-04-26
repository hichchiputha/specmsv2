import { useNavigate } from 'react-router-dom';
import { Clock, Users, Star, Lock, PlayCircle, CheckCircle } from 'lucide-react';

export default function LessonCard({ lesson, onClick }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) return onClick(lesson);
    const base = lesson.type === 'seminar' ? '/seminars' : '/lessons';
    navigate(`${base}/${lesson.id}`);
  };

  const progress = lesson.myProgress || lesson.progress || 0;
  const isEnrolled = lesson.isEnrolled || lesson.is_enrolled;
  const isFree = lesson.is_free === 1 || lesson.is_free === true || lesson.isFree;

  const difficultyColor = {
    beginner: 'var(--success)',
    intermediate: 'var(--warning)',
    advanced: 'var(--error)',
  }[lesson.difficulty] || 'var(--text-muted)';

  return (
    <div
      onClick={handleClick}
      className="card"
      style={{ cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column' }}
    >
      {/* Thumbnail */}
      <div style={{
        position: 'relative', paddingBottom: '56.25%', background: 'var(--bg-elevated)',
        flexShrink: 0,
      }}>
        {lesson.thumbnail_url ? (
          <img
            src={lesson.thumbnail_url}
            alt={lesson.title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${lesson.category_color || 'var(--accent-primary)'}22, ${lesson.category_color || 'var(--accent-secondary)'}11)`,
          }}>
            <PlayCircle size={40} style={{ color: lesson.category_color || 'var(--accent-primary)', opacity: 0.5 }} />
          </div>
        )}

        {/* Type badge */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          background: lesson.type === 'seminar' ? 'rgba(6,182,212,0.85)' : 'rgba(124,58,237,0.85)',
          color: 'white', backdropFilter: 'blur(4px)',
        }}>
          {lesson.type === 'seminar' ? '🎙 Seminar' : '📘 Lesson'}
        </div>

        {/* Price badge */}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
          background: isFree ? 'rgba(16,185,129,0.85)' : 'rgba(245,158,11,0.85)',
          color: 'white', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {isFree ? '✓ Free' : <><Lock size={9} /> Paid</>}
        </div>

        {/* Progress overlay */}
        {isEnrolled && progress > 0 && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 3, background: 'rgba(0,0,0,0.4)',
          }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: progress >= 90 ? 'var(--success)' : 'var(--accent-primary)',
            }} />
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Category */}
        {lesson.category_name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>{lesson.category_icon}</span>
            <span style={{ fontSize: 11, color: lesson.category_color || 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {lesson.category_name}
            </span>
          </div>
        )}

        {/* Title */}
        <h3 style={{
          fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
          lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {lesson.title}
        </h3>

        {/* Teacher */}
        {lesson.teacher_name && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            by {lesson.teacher_name}
          </div>
        )}

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto' }}>
          {lesson.duration_minutes > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
              <Clock size={11} /> {lesson.duration_minutes}m
            </span>
          )}
          {lesson.enrollment_count > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
              <Users size={11} /> {lesson.enrollment_count}
            </span>
          )}
          <span style={{
            fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
            color: difficultyColor, marginLeft: 'auto',
          }}>
            {lesson.difficulty}
          </span>
        </div>

        {/* Enrollment status / progress */}
        {isEnrolled && (
          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: progress >= 90 ? 'var(--success)' : 'var(--text-muted)' }}>
                {progress >= 90 ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={11} /> Completed
                  </span>
                ) : `${Math.round(progress)}% complete`}
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
