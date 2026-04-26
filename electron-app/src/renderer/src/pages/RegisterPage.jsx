import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, Loader, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      toast.error('Password must include uppercase, lowercase and a number'); return;
    }
    setLoading(true);
    const result = await register(form);
    setLoading(false);
    if (result.success) { toast.success('Account created!'); navigate('/dashboard'); }
    else toast.error(result.error || 'Registration failed');
  };

  return (
    <div style={{
      height: '100vh', display: 'flex', background: 'var(--bg-void)',
      alignItems: 'center', justifyContent: 'center', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(ellipse at 60% 20%, rgba(124,58,237,0.12) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(6,182,212,0.08) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: '100%', maxWidth: 480,
          background: 'var(--bg-deep)', border: '1px solid var(--border-default)',
          borderRadius: 24, padding: 40, position: 'relative',
        }}
      >
        <Link to="/login" style={{ textDecoration: 'none', position: 'absolute', top: 20, left: 20 }}>
          <button className="btn btn-ghost btn-sm"><ArrowLeft size={15} /> Back</button>
        </Link>

        <div style={{ textAlign: 'center', marginBottom: 32, marginTop: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <GraduationCap size={28} color="white" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', marginBottom: 6 }}>
            Create Account
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Join LMS Academy and start learning
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">First Name</label>
              <input className="input" placeholder="John" value={form.firstName} onChange={set('firstName')} required style={{ userSelect: 'text' }} />
            </div>
            <div className="input-group">
              <label className="input-label">Last Name</label>
              <input className="input" placeholder="Doe" value={form.lastName} onChange={set('lastName')} required style={{ userSelect: 'text' }} />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Email</label>
            <input type="email" className="input" placeholder="you@example.com" value={form.email} onChange={set('email')} required style={{ userSelect: 'text' }} />
          </div>

          <div className="input-group">
            <label className="input-label">Phone (optional)</label>
            <input type="tel" className="input" placeholder="+1 234 567 8900" value={form.phone} onChange={set('phone')} style={{ userSelect: 'text' }} />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'} className="input"
                placeholder="Min 8 chars, upper + lower + number"
                value={form.password} onChange={set('password')} required
                style={{ userSelect: 'text', paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 4 }}>
            {loading && <Loader size={18} style={{ animation: 'spin 0.7s linear infinite' }} />}
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 20 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
