// LessonsPage.jsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Filter, SlidersHorizontal, X } from 'lucide-react';
import api from '../utils/api';
import LessonCard from '../components/LessonCard';
import { motion } from 'framer-motion';

export function LessonsPage({ type = 'lesson' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    difficulty: '',
    isFree: '',
    sortBy: 'created_at',
    sortDir: 'DESC',
  });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['lessons', type, filters, page],
    queryFn: () => api.get('/lessons', { params: { type, ...filters, page, limit: 12 } }).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/admin/categories').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const lessons = data?.lessons || [];
  const pagination = data?.pagination || {};
  const isLesson = type === 'lesson';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isLesson ? '📘 Lessons' : '🎙 Seminars'}</h1>
          <p className="page-subtitle">
            {pagination.total || 0} {isLesson ? 'lessons' : 'seminars'} available
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13 }}>
          <Filter size={14} /> Filters:
        </div>

        <select
          className="input"
          value={filters.category}
          onChange={e => { setFilters(p => ({ ...p, category: e.target.value })); setPage(1); }}
          style={{ width: 160 }}
        >
          <option value="">All Categories</option>
          {(categories?.categories || []).map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>

        <select
          className="input"
          value={filters.difficulty}
          onChange={e => { setFilters(p => ({ ...p, difficulty: e.target.value })); setPage(1); }}
          style={{ width: 140 }}
        >
          <option value="">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>

        <select
          className="input"
          value={filters.isFree}
          onChange={e => { setFilters(p => ({ ...p, isFree: e.target.value })); setPage(1); }}
          style={{ width: 120 }}
        >
          <option value="">All Prices</option>
          <option value="true">Free Only</option>
          <option value="false">Paid Only</option>
        </select>

        <select
          className="input"
          value={`${filters.sortBy}_${filters.sortDir}`}
          onChange={e => {
            const [sortBy, sortDir] = e.target.value.split('_');
            setFilters(p => ({ ...p, sortBy, sortDir })); setPage(1);
          }}
          style={{ width: 150 }}
        >
          <option value="created_at_DESC">Newest First</option>
          <option value="created_at_ASC">Oldest First</option>
          <option value="view_count_DESC">Most Popular</option>
          <option value="title_ASC">A–Z</option>
        </select>

        {(filters.category || filters.difficulty || filters.isFree) && (
          <button className="btn btn-ghost btn-sm" onClick={() => {
            setFilters({ category: '', difficulty: '', isFree: '', sortBy: 'created_at', sortDir: 'DESC' });
            setPage(1);
          }}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid-lessons">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 300, borderRadius: 16 }} />
          ))}
        </div>
      ) : lessons.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{isLesson ? '📘' : '🎙'}</div>
          <h3>No {isLesson ? 'lessons' : 'seminars'} found</h3>
          <p className="text-muted">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid-lessons">
          {lessons.map((l, i) => (
            <motion.div key={l.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <LessonCard lesson={l} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 32 }}>
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
            Page {page} of {pagination.totalPages}
          </span>
          <button className="btn btn-secondary btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}

export default LessonsPage;
