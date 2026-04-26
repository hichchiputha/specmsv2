import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import api from '../utils/api';
import LessonCard from '../components/LessonCard';
import { motion, AnimatePresence } from 'framer-motion';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [type, setType] = useState('');
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); setSearched(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api.get('/search', { params: { q: query, type: type || undefined, limit: 24 } });
        setResults(r.data.results || []);
        setSearched(true);
      } catch (e) {}
      setLoading(false);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, type]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🔍 Search</h1>
          <p className="page-subtitle">Find lessons, seminars and more</p>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 600 }}>
        <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          ref={inputRef}
          className="input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search lessons, topics, teachers..."
          style={{ paddingLeft: 46, paddingRight: 44, fontSize: 15, height: 50, userSelect: 'text' }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setSearched(false); }}
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Type filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {[{ v: '', l: 'All' }, { v: 'lesson', l: '📘 Lessons' }, { v: 'seminar', l: '🎙 Seminars' }].map(({ v, l }) => (
          <button
            key={v}
            onClick={() => setType(v)}
            className={`btn btn-sm ${type === v ? 'btn-primary' : 'btn-secondary'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading && (
        <div className="grid-lessons">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 280, borderRadius: 16 }} />)}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>No results for "{query}"</h3>
          <p className="text-muted">Try different keywords or browse categories</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            {results.length} result{results.length !== 1 ? 's' : ''} for "<strong style={{ color: 'var(--text-primary)' }}>{query}</strong>"
          </p>
          <div className="grid-lessons">
            <AnimatePresence>
              {results.map((l, i) => (
                <motion.div key={l.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <LessonCard lesson={l} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {!searched && !loading && !query && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-state-icon" style={{ fontSize: 36 }}>🔍</div>
          <h3>Start typing to search</h3>
          <p className="text-muted">Search across all lessons and seminars</p>
        </div>
      )}
    </div>
  );
}
