import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Star, BookOpen, Users, Award } from 'lucide-react';
import api from '../utils/api';
import { motion } from 'framer-motion';

export default function TeachersPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => api.get('/teachers').then(r => r.data),
  });

  const teachers = data?.teachers || [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🎓 Teachers</h1>
          <p className="page-subtitle">Meet our expert instructors</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid-3">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 220, borderRadius: 16 }} />)}
        </div>
      ) : teachers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👨‍🏫</div>
          <h3>No teachers yet</h3>
        </div>
      ) : (
        <div className="grid-3">
          {teachers.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="card"
              style={{ padding: 24, cursor: 'pointer', textAlign: 'center' }}
              onClick={() => navigate(`/lessons?teacherId=${t.id}`)}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
            >
              {/* Avatar */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
                background: t.avatar_url ? 'transparent' : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 700, color: 'white', overflow: 'hidden',
                border: '3px solid var(--border-default)',
              }}>
                {t.avatar_url
                  ? <img src={t.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : `${t.first_name?.[0] || ''}${t.last_name?.[0] || ''}`
                }
              </div>

              {/* Featured badge */}
              {t.is_featured === 1 && (
                <div style={{ marginBottom: 8 }}>
                  <span className="badge badge-amber"><Award size={10} /> Featured</span>
                </div>
              )}

              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                {t.first_name} {t.last_name}
              </h3>

              {t.expertise && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{t.expertise}</p>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: 12, color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <BookOpen size={12} /> {t.lesson_count} lesson{t.lesson_count !== 1 ? 's' : ''}
                </span>
                {t.rating > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star size={12} style={{ color: 'var(--warning)' }} /> {t.rating.toFixed(1)}
                  </span>
                )}
                {t.years_experience > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={12} /> {t.years_experience}yr
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
