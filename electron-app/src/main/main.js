'use strict';

// Load .env FIRST before anything else
const path = require('path');
const fs = require('fs');

// Load env from project root (one level above electron-app/)
const envPath = path.join(__dirname, '../../../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
  });
}

const { app, BrowserWindow, ipcMain, session, shell, Menu } = require('electron');
const crypto = require('crypto');
const os = require('os');

// electron-log must be required before autoUpdater
const log = require('electron-log');
log.transports.file.level = 'debug';
log.transports.console.level = 'debug';
log.info('=== LMS Electron App Starting ===');
log.info('Node:', process.versions.node);
log.info('Chrome:', process.versions.chrome);
log.info('Electron:', process.versions.electron);

const { autoUpdater } = require('electron-updater');
autoUpdater.logger = log;

// ── Constants ──────────────────────────────────────────────────────────────
const IS_DEV = process.env.NODE_ENV === 'development' || !app.isPackaged;
const API_BASE = process.env.API_URL || 'http://localhost:3001';
const APP_TOKEN = process.env.APP_TOKEN || 'lms-electron-app-token-v1';

// Encryption keys (must match backend)
const VIDEO_ENCRYPTION_KEY = process.env.VIDEO_ENCRYPTION_KEY || 'lms-video-encryption-key-32bytes!';
const VIDEO_MASTER_KEY = process.env.VIDEO_MASTER_KEY || 'lms-master-video-key-32bytessss!';

const APP_VERSION = app.getVersion();

log.info('IS_DEV:', IS_DEV);
log.info('API_BASE:', API_BASE);
log.info('__dirname:', __dirname);

// ── State ──────────────────────────────────────────────────────────────────
let mainWindow = null;
let _lessonContent = null;

// ── Device Identity ────────────────────────────────────────────────────────
function getDeviceId() {
  try {
    const idFile = path.join(app.getPath('userData'), '.device-id');
    if (fs.existsSync(idFile)) {
      return fs.readFileSync(idFile, 'utf8').trim();
    }
    const id = crypto.randomBytes(16).toString('hex');
    fs.mkdirSync(path.dirname(idFile), { recursive: true });
    fs.writeFileSync(idFile, id, 'utf8');
    return id;
  } catch (e) {
    log.error('getDeviceId error:', e);
    return crypto.randomBytes(16).toString('hex');
  }
}

const DEVICE_ID = getDeviceId();
const PLATFORM = process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux';

// ── Crypto ─────────────────────────────────────────────────────────────────
function decrypt(crypted, ivs, key) {
  try {
    const keyBuffer = Buffer.from(key.padEnd(32, '0').substring(0, 32), 'utf8');
    const ivBuffer = Buffer.from(ivs, 'hex');
    const encryptedBuffer = Buffer.from(crypted, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);
    let decrypted = decipher.update(encryptedBuffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (e) {
    log.error('Decrypt error:', e.message);
    return null;
  }
}

function decryptLessonContent(content) {
  try {
    const { crypted, ivs } = content;
    if (!crypted || !ivs) return null;
    const raw = decrypt(crypted, ivs, VIDEO_MASTER_KEY);
    if (!raw) return null;
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  } catch (e) {
    log.error('decryptLessonContent error:', e);
    return null;
  }
}

function decryptVideoKey(playbackKey, playbackHash) {
  try {
    if (!playbackKey || !playbackHash) return null;
    const raw = decrypt(playbackKey, playbackHash, VIDEO_ENCRYPTION_KEY);
    if (!raw) return null;
    return Buffer.from(raw, 'base64').toString('utf8');
  } catch (e) {
    log.error('decryptVideoKey error:', e);
    return null;
  }
}

// ── Security ───────────────────────────────────────────────────────────────
function setupSecurity(win) {
  // Disable right-click context menu in production
  win.webContents.on('context-menu', (e) => {
    if (!IS_DEV) e.preventDefault();
  });

  // Block devtools shortcuts in production
  win.webContents.on('before-input-event', (event, input) => {
    if (!IS_DEV) {
      if (input.key === 'F12') { event.preventDefault(); return; }
      if ((input.control || input.meta) && input.shift && input.key === 'I') { event.preventDefault(); return; }
      if ((input.control || input.meta) && input.shift && input.key === 'J') { event.preventDefault(); return; }
      if ((input.control || input.meta) && input.key === 'u') { event.preventDefault(); return; }
    }
  });

  // Close devtools if opened in production
  win.webContents.on('devtools-opened', () => {
    if (!IS_DEV) {
      win.webContents.closeDevTools();
      log.warn('DevTools open attempt blocked');
    }
  });

  // Screen capture protection
  win.setContentProtection(!IS_DEV);

  // Block new browser windows
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

// ── Menu ───────────────────────────────────────────────────────────────────
function buildMenu() {
  if (IS_DEV) {
    const template = [{
      label: 'Dev',
      submenu: [
        { label: 'Toggle DevTools', accelerator: 'F12', click: () => mainWindow?.webContents.toggleDevTools() },
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
        { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', click: () => mainWindow?.webContents.reloadIgnoringCache() },
      ],
    }];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  } else {
    Menu.setApplicationMenu(null);
  }
}

// ── Window ─────────────────────────────────────────────────────────────────
async function createWindow() {
  log.info('createWindow() called');

  // Resolve renderer path
  // __dirname is electron-app/src/main/
  // renderer build is at electron-app/src/renderer/build/
  const rendererFile = IS_DEV
    ? null
    : path.join(__dirname, '../renderer/build/index.html');

  log.info('IS_DEV:', IS_DEV);
  log.info('rendererFile:', rendererFile);

  if (!IS_DEV) {
    // Verify the file exists before trying to load it
    if (!fs.existsSync(rendererFile)) {
      log.error('Renderer build file not found at:', rendererFile);
      log.error('Please run "npm run build:renderer" first to build the React app.');

      // Show an error window instead of silently crashing
      mainWindow = new BrowserWindow({
        width: 600,
        height: 400,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
        },
      });

      await mainWindow.loadURL(`data:text/html,
        <html>
          <head><title>Build Error</title></head>
          <body style="font-family:sans-serif;padding:20px;background:#1a1a2e;color:#eee;">
            <h2>⚠️ Renderer Not Built</h2>
            <p>The React app has not been built yet.</p>
            <p>Please run:</p>
            <pre style="background:#333;padding:10px;border-radius:5px;">cd electron-app/src/renderer && npm install && npm run build</pre>
            <p>Expected path: <code>${rendererFile}</code></p>
          </body>
        </html>
      `);
      return;
    }
    log.info('Renderer file exists ✓');
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: '#0f0f1a',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Handle renderer process crashes
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    log.error('Renderer process gone:', details);
  });

  mainWindow.webContents.on('crashed', (event) => {
    log.error('Renderer crashed');
  });

  mainWindow.webContents.on('unresponsive', () => {
    log.warn('Renderer unresponsive');
  });

  try {
    if (IS_DEV) {
      log.info('Loading dev URL: http://localhost:3000');
      await mainWindow.loadURL('http://localhost:3000');
      mainWindow.webContents.openDevTools();
    } else {
      log.info('Loading file:', rendererFile);
      await mainWindow.loadFile(rendererFile);
    }
    log.info('Window loaded successfully');
  } catch (err) {
    log.error('Failed to load window:', err.message);

    // Show error in the window
    await mainWindow.loadURL(`data:text/html,
      <html>
        <head><title>Error</title></head>
        <body style="font-family:sans-serif;padding:20px;background:#1a1a2e;color:#eee;">
          <h2>⚠️ Failed to Load App</h2>
          <pre style="background:#333;padding:10px;border-radius:5px;white-space:pre-wrap;">${err.message}</pre>
          <p>Check logs at: ${log.transports.file.getFile().path}</p>
        </body>
      </html>
    `);
    return;
  }

  mainWindow.once('ready-to-show', () => {
    log.info('ready-to-show');
    mainWindow.show();
    if (!IS_DEV) mainWindow.maximize();
  });

  mainWindow.on('closed', () => {
    log.info('Window closed');
    mainWindow = null;
  });

  setupSecurity(mainWindow);
  buildMenu();

  // Set Content-Security-Policy headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'self' ${API_BASE};` +
          `script-src 'self' 'unsafe-inline' https://www.youtube.com https://www.googleapis.com;` +
          `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;` +
          `font-src 'self' https://fonts.gstatic.com;` +
          `img-src 'self' data: https: blob:;` +
          `frame-src https://www.youtube.com https://www.youtube-nocookie.com;` +
          `connect-src 'self' ${API_BASE} https://www.googleapis.com;` +
          `media-src 'self' blob:;`
        ],
      },
    });
  });

  // Auto-update check (production only)
  if (!IS_DEV) {
    setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 5000);
  }
}

// ── IPC Handlers ───────────────────────────────────────────────────────────

ipcMain.handle('app:get-info', () => ({
  version: APP_VERSION,
  platform: PLATFORM,
  deviceId: DEVICE_ID,
  appToken: APP_TOKEN,
  isDev: IS_DEV,
}));

ipcMain.handle('app:get-api-url', () => API_BASE);

ipcMain.handle('crypto:init-lesson', (event, { crypted, ivs, playbackKey, playbackHash }) => {
  try {
    const content = decryptLessonContent({ crypted, ivs });
    if (!content) return { success: false, error: 'Failed to decrypt lesson content' };
    _lessonContent = { ...content, playbackKey, playbackHash };
    log.info(`Lesson initialized: ${content.lessonId}`);
    return { success: true, lessonId: content.lessonId };
  } catch (e) {
    log.error('init-lesson error:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('crypto:get-video-id', (event, { lessonId }) => {
  try {
    if (!_lessonContent || _lessonContent.lessonId !== lessonId) {
      return { success: false, error: 'No lesson content initialized' };
    }
    if (_lessonContent.exp && Date.now() > _lessonContent.exp) {
      _lessonContent = null;
      return { success: false, error: 'Video token expired, please reload' };
    }
    const videoKey = decryptVideoKey(_lessonContent.playbackKey, _lessonContent.playbackHash);
    if (!videoKey) return { success: false, error: 'Failed to decrypt video key' };
    const videoId = videoKey.split('|')[0];
    return { success: true, videoId };
  } catch (e) {
    log.error('get-video-id error:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('crypto:clear-lesson', () => {
  _lessonContent = null;
  return { success: true };
});

ipcMain.handle('video:setup-interceptor', (event, { accessToken, lessonId }) => {
  try {
    const filter = { urls: ['https://www.youtube.com/*', 'https://www.googleapis.com/*', 'https://rr*.googlevideo.com/*'] };
    session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
      const headers = { ...details.requestHeaders };
      if (accessToken) {
        headers['X-LMS-Access'] = accessToken;
        headers['X-LMS-Lesson'] = lessonId;
        headers['X-LMS-Device'] = DEVICE_ID;
      }
      callback({ requestHeaders: headers });
    });
    return { success: true };
  } catch (e) {
    log.error('setup-interceptor error:', e);
    return { success: false };
  }
});

ipcMain.handle('video:remove-interceptor', () => {
  try {
    session.defaultSession.webRequest.onBeforeSendHeaders(null);
  } catch (e) {}
  return { success: true };
});

ipcMain.handle('app:open-external', (event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://'))) {
    shell.openExternal(url);
    return { success: true };
  }
  return { success: false, error: 'Invalid URL' };
});

ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false);

ipcMain.handle('system:info', () => ({
  platform: PLATFORM,
  arch: process.arch,
  osVersion: os.release(),
  hostname: os.hostname(),
  totalMem: os.totalmem(),
}));

// ── App Events ─────────────────────────────────────────────────────────────
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('ready', () => {
  log.info('App ready event fired');
});

app.on('will-quit', () => {
  log.info('App quitting');
});

app.on('quit', () => {
  log.info('App quit event fired');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log.error('UNCAUGHT EXCEPTION:', error);
});

process.on('unhandledRejection', (reason) => {
  log.error('UNHANDLED REJECTION:', reason);
});

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  log.info('Second instance detected, quitting');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    log.info('app.whenReady() resolved');
    try {
      await createWindow();
    } catch (err) {
      log.error('Failed to create window:', err);
      // Don't quit immediately - show the error window
    }
  }).catch(err => {
    log.error('Fatal error during app startup:', err);
    // Give user a moment to see logs before quitting
    setTimeout(() => app.quit(), 2000);
  });
}

// ── Auto-updater ───────────────────────────────────────────────────────────
autoUpdater.on('update-available', () => mainWindow?.webContents.send('updater:update-available'));
autoUpdater.on('update-downloaded', () => mainWindow?.webContents.send('updater:update-downloaded'));
ipcMain.handle('updater:install', () => autoUpdater.quitAndInstall());
