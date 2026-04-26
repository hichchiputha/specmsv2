import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, CheckCircle, Flame, ChevronRight, Play, Star } from 'lucide-react';
import api from '../utils/api';
import LessonCard from '../components/LessonCard';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';

function StatCard({ icon, label, value, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
        borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16,
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 26, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
      </div>
    </motion.div>
  );
}

function ContinueCard({ lesson, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
        borderRadius: 14, padding: '14px', display: 'flex', gap: 14,
        cursor: 'pointer', transition: 'all 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--bg-surface)'; }}
    >
      <div style={{
        width: 80, height: 56, borderRadius: 10, flexShrink: 0,
        background: 'var(--bg-elevated)', overflow: 'hidden', position: 'relative',
      }}>
        {lesson.thumbnail_url
          ? <img src={lesson.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Play size={20} style={{ color: 'var(--accent-primary)' }} />
            </div>
        }
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)',
        }}>
          <Play size={18} color="white" fill="white" />
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
          {lesson.title}
        </div>
        <div style={{ marginBottom: 6 }}>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${lesson.percent_complete}%` }} />
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {Math.round(lesson.percent_complete)}% complete
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
    staleTime: 60 * 1000,
  });

  const stats = data?.stats || {};

  return (
    <div className="page" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},&nbsp;
            {user?.firstName} 👋
          </h1>
          <p className="page-subtitle">
            {stats.activeThisWeek > 0
              ? `You've been active ${stats.activeThisWeek} lesson${stats.activeThisWeek > 1 ? 's' : ''} this week. Keep it up!`
              : "Ready to learn something new today?"}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        <StatCard icon={<BookOpen size={22} color="#7c3aed" />} label="Enrolled Lessons" value={stats.totalEnrolled || 0} color="#7c3aed" />
        <StatCard icon={<CheckCircle size={22} color="#10b981" />} label="Completed" value={stats.completed || 0} color="#10b981" />
        <StatCard icon={<Clock size={22} color="#06b6d4" />} label="Hours Learned" value={`${stats.totalHours || 0}h`} color="#06b6d4" />
        <StatCard icon={<Flame size={22} color="#f59e0b" />} label="Active This Week" value={stats.activeThisWeek || 0} color="#f59e0b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Continue Watching */}
          {data?.continueWatching?.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Play size={18} style={{ color: 'var(--accent-primary)' }} /> Continue Watching
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.continueWatching.map(l => (
                  <ContinueCard
                    key={l.id}
                    lesson={l}
                    onClick={() => navigate(`/${l.type === 'seminar' ? 'seminars' : 'lessons'}/${l.id}/watch`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* New Lessons */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Star size={18} style={{ color: 'var(--accent-tertiary)' }} /> New This Week
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/lessons')}>
                View All <ChevronRight size={14} />
              </button>
            </div>
            {isLoading ? (
              <div className="grid-lessons">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 280, borderRadius: 16 }} />
                ))}
              </div>
            ) : data?.newLessons?.length > 0 ? (
              <div className="grid-lessons">
                {data.newLessons.map((l, i) => (
                  <motion.div key={l.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                    <LessonCard lesson={l} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📚</div>
                <p>No new lessons this week. Check back soon!</p>
              </div>
            )}
          </section>

          {/* Featured */}
          {data?.featured?.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>✨ Featured</h3>
              </div>
              <div className="grid-lessons">
                {data.featured.map((l, i) => (
                  <motion.div key={l.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                    <LessonCard lesson={l} />
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Announcements */}
          {data?.announcements?.length > 0 && (
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
              borderRadius: 16, padding: 20,
            }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>
                📢 Announcements
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.announcements.map(a => (
                  <div key={a.id} style={{
                    padding: '12px', background: 'var(--bg-elevated)', borderRadius: 10,
                    borderLeft: '3px solid var(--accent-primary)',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{a.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          {data?.categories?.length > 0 && (
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
              borderRadius: 16, padding: 20,
            }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>
                Browse Categories
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.categories.filter(c => c.lesson_count > 0).map(c => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/lessons?category=${c.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', background: 'transparent', border: 'none',
                      borderRadius: 10, cursor: 'pointer', color: 'var(--text-secondary)',
                      transition: 'all 0.15s', fontSize: 13,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{c.icon}</span>
                      <span>{c.name}</span>
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 100,
                      background: `${c.color}18`, color: c.color,
                    }}>
                      {c.lesson_count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
