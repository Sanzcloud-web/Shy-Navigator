import { contextBridge, ipcRenderer } from 'electron'

// Expose a minimal API if needed later
contextBridge.exposeInMainWorld('shy', {
  version: '0.1.0',
  onDownloadStarted: (cb: (payload: { filename: string; url: string; totalBytes: number }) => void) => {
    const listener = (_: any, payload: { filename: string; url: string; totalBytes: number }) => cb(payload)
    ipcRenderer.on('shy:download-started', listener)
    return () => ipcRenderer.removeListener('shy:download-started', listener)
  },
  onAccelerator: (cb: (evt: { type: 'open-palette' | 'toggle-sidebar' }) => void) => {
    const listener = (_: any, payload: { type: 'open-palette' | 'toggle-sidebar' }) => cb(payload)
    ipcRenderer.on('shy:accelerator', listener)
    return () => ipcRenderer.removeListener('shy:accelerator', listener)
  },
  // Global shortcuts forwarded from main when a webview has focus
  onGlobalShortcut: (cb: (shortcut: 'cmd+t' | 'cmd+s') => void) => {
    const listener = (_: any, payload: 'cmd+t' | 'cmd+s') => cb(payload)
    ipcRenderer.on('global-shortcut', listener)
    return () => ipcRenderer.removeListener('global-shortcut', listener)
  },
  openAppMenu: (pos?: { x: number; y: number }) => {
    ipcRenderer.send('shy:open-app-menu', pos)
  }
})

// Expose API pour les shortcuts globaux
contextBridge.exposeInMainWorld('electronAPI', {
  onGlobalShortcut: (callback: (event: any, shortcut: string) => void) => {
    ipcRenderer.on('global-shortcut', callback)
    return () => ipcRenderer.removeAllListeners('global-shortcut')
  }
})

export {}
