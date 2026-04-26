import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, Loader, Shield } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    const result = await login(form);
    setLoading(false);
    if (result.success) {
      toast.success('Welcome back!');
      navigate('/dashboard');
    } else {
      toast.error(result.error || 'Login failed');
    }
  };

  return (
    <div style={{
      height: '100vh', display: 'flex', background: 'var(--bg-void)',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', top: '-20%', right: '-10%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', left: '-10%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)',
        }} />
        {/* Grid pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Left panel - Branding */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 48, position: 'relative',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', maxWidth: 400 }}
        >
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 24px',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 48px rgba(124,58,237,0.4)',
          }}>
            <GraduationCap size={36} color="white" />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700,
            color: 'var(--text-primary)', marginBottom: 12, letterSpacing: '-0.03em',
          }}>
            LMS Academy
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.7 }}>
            Your exclusive learning platform.<br />
            Premium courses, expert teachers, verified content.
          </p>

          {/* Features */}
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
            {[
              { icon: '🔐', text: 'Encrypted content delivery' },
              { icon: '🎬', text: 'HD video lessons & seminars' },
              { icon: '📄', text: 'Downloadable resources & PDFs' },
              { icon: '📊', text: 'Track your learning progress' },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                  borderRadius: 12, padding: '12px 16px',
                }}
              >
                <span style={{ fontSize: 20 }}>{f.icon}</span>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{f.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right panel - Login form */}
      <div style={{
        width: 440, flexShrink: 0,
        background: 'var(--bg-deep)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 40,
      }}>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ width: '100%' }}
        >
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', marginBottom: 8 }}>
              Sign In
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Welcome back! Sign in to continue learning.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                autoComplete="email"
                required
                style={{ userSelect: 'text' }}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  autoComplete="current-password"
                  required
                  style={{ userSelect: 'text', paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', display: 'flex',
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? <Loader size={18} className="animate-spin" style={{ animation: 'spin 0.7s linear infinite' }} /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="divider" />

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              Don't have an account?
            </p>
            <Link to="/register" style={{ textDecoration: 'none' }}>
              <button className="btn btn-secondary btn-full">
                Create Account
              </button>
            </Link>
          </div>

          <div style={{
            marginTop: 32, padding: '12px 16px',
            background: 'var(--bg-surface)', borderRadius: 10,
            border: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Shield size={14} style={{ color: 'var(--accent-secondary)', flexShrink: 0 }} />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              This is a secure, desktop-only application. Your session is valid for 7 days.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
