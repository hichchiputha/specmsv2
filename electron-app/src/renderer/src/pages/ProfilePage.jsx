import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Lock, Monitor, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '', bio: user?.bio || '' });
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get('/users/sessions').then(r => r.data),
    enabled: activeTab === 'security',
  });

  const profileMutation = useMutation({
    mutationFn: (data) => api.put('/users/profile', data),
    onSuccess: () => { toast.success('Profile updated!'); updateUser({ firstName: profileForm.firstName, lastName: profileForm.lastName }); },
    onError: () => toast.error('Update failed'),
  });

  const passMutation = useMutation({
    mutationFn: (data) => api.put('/auth/change-password', data),
    onSuccess: () => { toast.success('Password changed!'); setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to change password'),
  });

  const revokeSession = useMutation({
    mutationFn: (sid) => api.delete(`/users/sessions/${sid}`),
    onSuccess: () => { toast.success('Session revoked'); queryClient.invalidateQueries(['sessions']); },
  });

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    passMutation.mutate({ currentPassword: passForm.currentPassword, newPassword: passForm.newPassword });
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'sessions', label: 'Sessions', icon: Monitor },
  ];

  return (
    <div className="page" style={{ paddingBottom: 40 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">👤 My Profile</h1>
          <p className="page-subtitle">Manage your account settings</p>
        </div>
      </div>

      {/* User card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 24, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 700, color: 'white',
        }}>
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>{user?.firstName} {user?.lastName}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 2 }}>{user?.email}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <span className={`badge ${user?.role === 'admin' ? 'badge-red' : user?.role === 'teacher' ? 'badge-amber' : 'badge-purple'}`} style={{ textTransform: 'capitalize' }}>
              {user?.role}
            </span>
            {user?.isVerified && <span className="badge badge-green"><CheckCircle size={9} /> Verified</span>}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`btn btn-sm ${activeTab === id ? 'btn-primary' : 'btn-ghost'}`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {activeTab === 'profile' && (
          <div style={{ maxWidth: 520 }}>
            <form onSubmit={e => { e.preventDefault(); profileMutation.mutate(profileForm); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">First Name</label>
                  <input className="input" value={profileForm.firstName} onChange={e => setProfileForm(p => ({ ...p, firstName: e.target.value }))} style={{ userSelect: 'text' }} />
                </div>
                <div className="input-group">
                  <label className="input-label">Last Name</label>
                  <input className="input" value={profileForm.lastName} onChange={e => setProfileForm(p => ({ ...p, lastName: e.target.value }))} style={{ userSelect: 'text' }} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Phone</label>
                <input className="input" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} style={{ userSelect: 'text' }} />
              </div>
              <div className="input-group">
                <label className="input-label">Bio</label>
                <textarea className="input" rows={3} value={profileForm.bio} onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))} style={{ resize: 'vertical', userSelect: 'text' }} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={profileMutation.isPending} style={{ width: 'fit-content' }}>
                {profileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'security' && (
          <div style={{ maxWidth: 480 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Change Password</h3>
            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Current Password</label>
                <input type="password" className="input" value={passForm.currentPassword} onChange={e => setPassForm(p => ({ ...p, currentPassword: e.target.value }))} required style={{ userSelect: 'text' }} />
              </div>
              <div className="input-group">
                <label className="input-label">New Password</label>
                <input type="password" className="input" value={passForm.newPassword} onChange={e => setPassForm(p => ({ ...p, newPassword: e.target.value }))} required style={{ userSelect: 'text' }} />
              </div>
              <div className="input-group">
                <label className="input-label">Confirm New Password</label>
                <input type="password" className="input" value={passForm.confirmPassword} onChange={e => setPassForm(p => ({ ...p, confirmPassword: e.target.value }))} required style={{ userSelect: 'text' }} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={passMutation.isPending} style={{ width: 'fit-content' }}>
                {passMutation.isPending ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div style={{ maxWidth: 620 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Active Sessions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(sessions?.sessions || []).map(s => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                  background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12,
                }}>
                  <Monitor size={20} style={{ color: 'var(--accent-secondary)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {s.device_name || 'Unknown Device'} · {s.platform}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      Last active: {new Date(s.last_used_at).toLocaleString()} · {s.ip_address}
                    </div>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => revokeSession.mutate(s.id)}>Revoke</button>
                </div>
              ))}
              {(!sessions?.sessions || sessions.sessions.length === 0) && (
                <div className="empty-state" style={{ padding: 32 }}>
                  <Monitor size={32} style={{ color: 'var(--text-muted)' }} />
                  <p className="text-muted">No active sessions found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
