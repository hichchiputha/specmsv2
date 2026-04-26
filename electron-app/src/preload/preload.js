'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe, typed API to the renderer
contextBridge.exposeInMainWorld('electron', {
  // ── App Info ──────────────────────────────────────────────────────────
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  getApiUrl: () => ipcRenderer.invoke('app:get-api-url'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),

  // ── Crypto (Video Protection) ─────────────────────────────────────────
  crypto: {
    initLesson: (data) => ipcRenderer.invoke('crypto:init-lesson', data),
    getVideoId: (data) => ipcRenderer.invoke('crypto:get-video-id', data),
    clearLesson: () => ipcRenderer.invoke('crypto:clear-lesson'),
  },

  // ── Video Player ──────────────────────────────────────────────────────
  video: {
    setupInterceptor: (data) => ipcRenderer.invoke('video:setup-interceptor', data),
    removeInterceptor: () => ipcRenderer.invoke('video:remove-interceptor'),
  },

  // ── Window Controls ───────────────────────────────────────────────────
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  },

  // ── System Info ───────────────────────────────────────────────────────
  system: {
    info: () => ipcRenderer.invoke('system:info'),
  },

  // ── Updater ───────────────────────────────────────────────────────────
  updater: {
    installUpdate: () => ipcRenderer.invoke('updater:install'),
    onUpdateAvailable: (cb) => ipcRenderer.on('updater:update-available', cb),
    onUpdateDownloaded: (cb) => ipcRenderer.on('updater:update-downloaded', cb),
    removeListeners: () => {
      ipcRenderer.removeAllListeners('updater:update-available');
      ipcRenderer.removeAllListeners('updater:update-downloaded');
    },
  },
});
