import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Loader } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form);
      toast.success('Welcome back, Admin!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-void)', position: 'relative',
    }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(ellipse at 50% 30%, rgba(239,68,68,0.1) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(124,58,237,0.07) 0%, transparent 50%)',
      }} />

      <div style={{
        width: '100%', maxWidth: 420, padding: 40,
        background: 'var(--bg-deep)', border: '1px solid var(--border-default)',
        borderRadius: 24, position: 'relative',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 32px rgba(239,68,68,0.3)',
          }}>
            <Shield size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 6 }}>Admin Portal</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>LMS Academy Management System</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="input-group">
            <label className="input-label">Admin Email</label>
            <input
              type="email" className="input"
              placeholder="admin@lms.local"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              autoComplete="email" required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'} className="input"
                placeholder="Enter admin password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required style={{ paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-full btn-lg" disabled={loading}
            style={{ marginTop: 8, background: 'linear-gradient(135deg,#ef4444,#f59e0b)', color: 'white', fontWeight: 600 }}>
            {loading ? <Loader size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Shield size={16} />}
            {loading ? 'Signing in…' : 'Sign In to Admin'}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: '12px 14px', background: 'rgba(239,68,68,0.06)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.15)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          🔒 This portal is restricted to administrators and teachers only.
        </div>
      </div>
    </div>
  );
}
