import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  ArrowLeft, SkipBack, SkipForward, Settings, RefreshCw,
  Lock, AlertTriangle,
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

// ── Helpers ────────────────────────────────────────────────────────────────
function formatTime(sec) {
  if (!sec || isNaN(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) { resolve(window.YT); return; }
    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
  });
}

// ── Player Manager ─────────────────────────────────────────────────────────
class PlayerManager {
  constructor() { this.player = null; this.ready = false; }

  create(elementId, videoId, onReady, onStateChange, onError) {
    if (this.player) this.destroy();
    loadYouTubeAPI().then((YT) => {
      this.player = new YT.Player(elementId, {
        videoId,
        playerVars: {
          controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3,
          modestbranding: 1, rel: 0, showinfo: 0, playsinline: 1,
          enablejsapi: 1, origin: window.location.origin || 'http://localhost:3000',
        },
        events: {
          onReady: () => { this.ready = true; onReady?.(); },
          onStateChange,
          onError,
        },
      });
    });
  }

  play()   { if (this.ready) this.player?.playVideo(); }
  pause()  { if (this.ready) this.player?.pauseVideo(); }
  seek(s)  { if (this.ready) this.player?.seekTo(s, true); }
  vol(v)   { if (this.ready) this.player?.setVolume(v); }
  mute()   { if (this.ready) this.player?.mute(); }
  unmute() { if (this.ready) this.player?.unMute(); }
  time()   { return this.player?.getCurrentTime?.() || 0; }
  dur()    { return this.player?.getDuration?.() || 0; }
  state()  { return this.player?.getPlayerState?.() ?? -1; }
  quality(q) { if (this.ready) this.player?.setPlaybackQuality(q); }
  qualities() { return this.player?.getAvailableQualityLevels?.() || []; }
  destroy() { try { this.player?.destroy?.(); } catch(e) {} this.player = null; this.ready = false; }
}

// ── Component ──────────────────────────────────────────────────────────────
export default function VideoPlayerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const pm = useRef(new PlayerManager());
  const progressTimer  = useRef(null);
  const saveTimer      = useRef(null);
  const controlsTimer  = useRef(null);
  const containerRef   = useRef(null);

  const [videoId, setVideoId]               = useState(null);
  const [playerReady, setPlayerReady]        = useState(false);
  const [isPlaying, setIsPlaying]            = useState(false);
  const [isMuted, setIsMuted]               = useState(false);
  const [volume, setVolume]                  = useState(80);
  const [currentTime, setCurrentTime]        = useState(0);
  const [duration, setDuration]              = useState(0);
  const [progress, setProgress]              = useState(0);
  const [isFullscreen, setIsFullscreen]      = useState(false);
  const [showControls, setShowControls]      = useState(true);
  const [qualities, setQualities]            = useState([]);
  const [currentQuality, setCurrentQuality]  = useState('auto');
  const [showQuality, setShowQuality]        = useState(false);
  const [loading, setLoading]                = useState(true);
  const [error, setError]                    = useState(null);

  // ── Data fetching ──────────────────────────────────────────────────────
  const { data: lesson } = useQuery({
    queryKey: ['lesson', id],
    queryFn: () => api.get(`/lessons/${id}`).then(r => r.data),
  });

  const { data: tokenData, isError: tokenError } = useQuery({
    queryKey: ['video-token', id],
    queryFn: () => api.get(`/video/lesson-token/${id}`).then(r => r.data),
    enabled: !!(lesson?.isEnrolled),
    retry: 1,
    onError: (err) => setError(err.response?.data?.error || 'Failed to load video token'),
  });

  const saveProg = useMutation({
    mutationFn: (data) => api.put(`/progress/${id}`, data),
  });

  // ── Init video after token arrives ─────────────────────────────────────
  useEffect(() => {
    if (!tokenData) return;

    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        let resolvedVideoId = null;

        if (window.electron) {
          // Electron path: decrypt via main process
          const initResult = await window.electron.crypto.initLesson({
            crypted: tokenData.key,
            ivs: tokenData.hash,
            playbackKey: tokenData.playbackKey,
            playbackHash: tokenData.playbackHash,
          });
          if (!initResult.success) throw new Error(initResult.error || 'Decryption failed');

          await window.electron.video.setupInterceptor({
            accessToken: tokenData.accessToken,
            lessonId: id,
          });

          const keyResult = await window.electron.crypto.getVideoId({ lessonId: id });
          if (!keyResult.success) throw new Error(keyResult.error || 'Could not get video ID');
          resolvedVideoId = keyResult.videoId;
        } else {
          // Dev/web fallback — skip encryption (only works if backend returns plaintext)
          setError('Video playback requires the desktop application.');
          setLoading(false);
          return;
        }

        setVideoId(resolvedVideoId);
        setLoading(false);
      } catch (e) {
        setError(e.message);
        setLoading(false);
      }
    };

    init();
    return () => {
      window.electron?.crypto.clearLesson().catch(() => {});
      window.electron?.video.removeInterceptor().catch(() => {});
    };
  }, [tokenData, id]);

  // ── Create YouTube player when videoId is ready ────────────────────────
  useEffect(() => {
    if (!videoId) return;
    // Small delay to ensure the iframe div is mounted
    const t = setTimeout(() => {
      pm.current.create(
        'yt-player',
        videoId,
        () => {
          setPlayerReady(true);
          pm.current.vol(volume);
          // Seek to last position
          if (lesson?.myLastPosition > 10) {
            pm.current.seek(lesson.myLastPosition);
          }
        },
        (e) => {
          // YT states: -1=unstarted 0=ended 1=playing 2=paused 3=buffering 5=cued
          setIsPlaying(e.data === 1);
          if (e.data === 1) {
            const q = pm.current.qualities();
            if (q.length > 0) setQualities(q);
          }
          if (e.data === 0) {
            // Ended — save 100% progress
            const dur = pm.current.dur();
            if (dur > 0) {
              saveProg.mutate({ watchedSeconds: Math.round(dur), totalSeconds: Math.round(dur), lastPosition: 0 });
            }
          }
        },
        (e) => {
          const msgs = { 2: 'Invalid video ID', 5: 'HTML5 player error', 100: 'Video not found', 101: 'Embedding not allowed', 150: 'Embedding not allowed' };
          setError(msgs[e.data] || `YouTube error (${e.data})`);
        }
      );
    }, 300);
    return () => {
      clearTimeout(t);
      pm.current.destroy();
    };
  }, [videoId]);

  // ── Progress polling (every 500ms) ────────────────────────────────────
  useEffect(() => {
    if (!playerReady) return;
    progressTimer.current = setInterval(() => {
      const ct  = pm.current.time();
      const dur = pm.current.dur();
      setCurrentTime(ct);
      setDuration(dur);
      if (dur > 0) setProgress((ct / dur) * 100);
    }, 500);

    // Auto-save progress every 15s
    saveTimer.current = setInterval(() => {
      const ct  = pm.current.time();
      const dur = pm.current.dur();
      if (dur > 0 && ct > 5) {
        saveProg.mutate({
          watchedSeconds: Math.round(ct),
          totalSeconds:   Math.round(dur),
          lastPosition:   Math.round(ct),
        });
      }
    }, 15000);

    return () => {
      clearInterval(progressTimer.current);
      clearInterval(saveTimer.current);
    };
  }, [playerReady]);

  // ── Controls auto-hide ─────────────────────────────────────────────────
  const bumpControls = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3500);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', bumpControls);
    return () => window.removeEventListener('mousemove', bumpControls);
  }, [bumpControls]);

  useEffect(() => {
    if (!isPlaying) setShowControls(true);
  }, [isPlaying]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!playerReady) return;
      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); isPlaying ? pm.current.pause() : pm.current.play(); break;
        case 'ArrowLeft':   e.preventDefault(); pm.current.seek(Math.max(0, currentTime - 10)); break;
        case 'ArrowRight':  e.preventDefault(); pm.current.seek(currentTime + 10); break;
        case 'ArrowUp':     e.preventDefault(); setVolume(v => { const n = Math.min(100, v+10); pm.current.vol(n); return n; }); break;
        case 'ArrowDown':   e.preventDefault(); setVolume(v => { const n = Math.max(0, v-10); pm.current.vol(n); return n; }); break;
        case 'm':           e.preventDefault(); isMuted ? (pm.current.unmute(), setIsMuted(false)) : (pm.current.mute(), setIsMuted(true)); break;
        case 'f':           e.preventDefault(); toggleFullscreen(); break;
        default: break;
      }
      bumpControls();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [playerReady, isPlaying, isMuted, currentTime, bumpControls]);

  // ── Fullscreen change detection ────────────────────────────────────────
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────
  const togglePlay = () => isPlaying ? pm.current.pause() : pm.current.play();

  const toggleMute = () => {
    if (isMuted) { pm.current.unmute(); setIsMuted(false); }
    else { pm.current.mute(); setIsMuted(true); }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const pos = pct * duration;
    pm.current.seek(pos);
    setCurrentTime(pos);
    setProgress(pct * 100);
  };

  const handleVolume = (e) => {
    const v = parseInt(e.target.value);
    setVolume(v);
    pm.current.vol(v);
    setIsMuted(v === 0);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };

  const handleQuality = (q) => {
    pm.current.quality(q === 'auto' ? 'default' : q);
    setCurrentQuality(q);
    setShowQuality(false);
  };

  const handleBack = () => {
    const ct = pm.current.time(), dur = pm.current.dur();
    if (dur > 0 && ct > 5) {
      saveProg.mutate({ watchedSeconds: Math.round(ct), totalSeconds: Math.round(dur), lastPosition: Math.round(ct) });
    }
    pm.current.pause();
    navigate(-1);
  };

  // ── Guard: not enrolled ────────────────────────────────────────────────
  if (lesson && !lesson.isEnrolled) {
    return (
      <div style={{ height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
        <Lock size={48} style={{ color: '#7c3aed' }} />
        <h2 style={{ color: 'white', fontFamily: 'var(--font-display)' }}>Not Enrolled</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>You need to enroll in this lesson to watch it.</p>
        <button className="btn btn-primary" onClick={() => navigate(`/lessons/${id}`)}>View Lesson</button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      style={{ height: '100vh', background: '#000', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
    >
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        padding: '14px 20px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)',
        display: 'flex', alignItems: 'center', gap: 12,
        transition: 'opacity 0.3s', opacity: showControls ? 1 : 0, pointerEvents: showControls ? 'auto' : 'none',
      }}>
        <button onClick={handleBack} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 12px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <ArrowLeft size={15} /> Back
        </button>
        <h2 style={{ color: 'white', fontSize: 14, fontFamily: 'var(--font-display)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lesson?.title || 'Loading…'}
        </h2>
        {progress > 0 && (
          <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, background: 'rgba(16,185,129,0.25)', color: '#34d399', fontWeight: 600 }}>
            {Math.round(progress)}% complete
          </span>
        )}
      </div>

      {/* Player area */}
      <div style={{ flex: 1, position: 'relative', cursor: showControls ? 'default' : 'none' }} onClick={togglePlay}>
        {/* Loading overlay */}
        {(loading || (!videoId && !error)) && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 10, background: '#000' }}>
            <div style={{ width: 44, height: 44, border: '3px solid rgba(124,58,237,0.3)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Decrypting secure video…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 10, background: '#000' }}>
            <AlertTriangle size={48} style={{ color: '#ef4444' }} />
            <h3 style={{ color: 'white', margin: 0 }}>Playback Error</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', maxWidth: 360 }}>{error}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={() => { setError(null); setLoading(true); window.location.reload(); }}>
                <RefreshCw size={14} /> Retry
              </button>
              <button className="btn btn-secondary" onClick={handleBack}>Go Back</button>
            </div>
          </div>
        )}

        {/* YouTube iframe — hidden controls, nocookie */}
        {videoId && (
          <iframe
            id="yt-player"
            title="Lesson Video"
            style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none', display: error ? 'none' : 'block' }}
            allow="autoplay; encrypted-media"
          />
        )}

        {/* Click interceptor (prevents YouTube UI interaction) */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 5 }} onClick={togglePlay} />
      </div>

      {/* Bottom controls */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
        padding: '40px 20px 18px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.92), transparent)',
        transition: 'opacity 0.3s', opacity: showControls ? 1 : 0, pointerEvents: showControls ? 'auto' : 'none',
      }}>
        {/* Seek bar */}
        <div
          onClick={handleSeek}
          style={{ height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 100, cursor: 'pointer', marginBottom: 14, position: 'relative' }}
          onMouseEnter={e => e.currentTarget.style.height = '6px'}
          onMouseLeave={e => e.currentTarget.style.height = '4px'}
        >
          <div style={{ height: '100%', width: `${Math.min(100, progress)}%`, background: 'linear-gradient(90deg, #7c3aed, #06b6d4)', borderRadius: 100 }} />
          <div style={{ position: 'absolute', top: '50%', left: `${Math.min(100, progress)}%`, transform: 'translate(-50%, -50%)', width: 14, height: 14, borderRadius: '50%', background: 'white', boxShadow: '0 0 6px rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
        </div>

        {/* Controls row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Play/Pause */}
          <button onClick={togglePlay} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', padding: 4 }}>
            {isPlaying ? <Pause size={22} /> : <Play size={22} />}
          </button>

          {/* Skip back 10s */}
          <button onClick={() => pm.current.seek(Math.max(0, currentTime - 10))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, padding: 4 }}>
            <SkipBack size={16} /> 10
          </button>

          {/* Skip forward 10s */}
          <button onClick={() => pm.current.seek(currentTime + 10)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, padding: 4 }}>
            10 <SkipForward size={16} />
          </button>

          {/* Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={toggleMute} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', padding: 4 }}>
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range" min="0" max="100" value={isMuted ? 0 : volume}
              onChange={handleVolume}
              style={{ width: 72, accentColor: '#7c3aed', cursor: 'pointer' }}
            />
          </div>

          {/* Time */}
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--font-mono)', letterSpacing: '0.03em', marginLeft: 4 }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div style={{ flex: 1 }} />

          {/* Quality selector */}
          {qualities.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowQuality(q => !q); }}
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: 'white', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Settings size={12} /> {currentQuality === 'auto' ? 'Auto' : currentQuality.toUpperCase()}
              </button>
              {showQuality && (
                <div style={{ position: 'absolute', bottom: '110%', right: 0, background: 'rgba(15,15,26,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 6, minWidth: 120, backdropFilter: 'blur(12px)', zIndex: 30 }}>
                  {['auto', ...qualities].map(q => (
                    <button
                      key={q}
                      onClick={(e) => { e.stopPropagation(); handleQuality(q); }}
                      style={{ display: 'block', width: '100%', padding: '7px 12px', background: currentQuality === q ? 'rgba(124,58,237,0.2)' : 'none', border: 'none', borderRadius: 7, cursor: 'pointer', textAlign: 'left', color: currentQuality === q ? '#a78bfa' : 'white', fontSize: 12 }}
                    >
                      {q === 'auto' ? '⚙ Auto' : q.replace('hd', '').replace('large', '480p').replace('medium', '360p').replace('small', '240p') + (q.includes('hd') ? 'p HD' : '')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', padding: 4 }}>
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
