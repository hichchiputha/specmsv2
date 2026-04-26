import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function UpdateBanner() {
  const [updateReady, setUpdateReady] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!window.electron) return;
    window.electron.updater.onUpdateAvailable(() => setUpdateAvailable(true));
    window.electron.updater.onUpdateDownloaded(() => setUpdateReady(true));
    return () => window.electron.updater.removeListeners();
  }, []);

  if (!updateReady && !updateAvailable) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: updateReady ? 'var(--success)' : 'var(--accent-primary)',
      color: 'white', padding: '10px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: '13px', fontWeight: 500,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Download size={15} />
        {updateReady ? 'Update downloaded! Restart to apply.' : 'A new update is being downloaded...'}
      </span>
      {updateReady && (
        <button
          onClick={() => window.electron.updater.installUpdate()}
          style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
            padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
          }}
        >
          Restart Now
        </button>
      )}
    </div>
  );
}
