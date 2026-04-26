export default function BlockedPage() {
  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#08080f', color: '#f1f0ff', textAlign: 'center', padding: 40,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Decorative background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 50%, rgba(239,68,68,0.08) 0%, transparent 70%)',
      }} />

      <div style={{
        width: 80, height: 80, borderRadius: 24, marginBottom: 24,
        background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 36, position: 'relative',
      }}>
        🔒
      </div>

      <h1 style={{
        fontSize: '2rem', fontWeight: 800, marginBottom: 12, letterSpacing: '-0.03em',
        color: '#f1f0ff',
      }}>
        Access Restricted
      </h1>

      <p style={{
        fontSize: 16, color: '#6060a0', maxWidth: 400, lineHeight: 1.7, marginBottom: 32,
      }}>
        This portal is not accessible from a standard web browser.
        Please use the <strong style={{ color: '#a78bfa' }}>LMS Academy desktop application</strong> to access your content.
      </p>

      <div style={{
        padding: '16px 24px', background: 'rgba(239,68,68,0.06)',
        border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14,
        fontSize: 13, color: '#9090b0', maxWidth: 380, lineHeight: 1.6,
      }}>
        If you believe this is an error, please contact your system administrator.
      </div>
    </div>
  );
}
