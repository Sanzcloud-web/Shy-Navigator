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

// Expose API pour les shortcuts globaux et webview setup
contextBridge.exposeInMainWorld('electronAPI', {
  onGlobalShortcut: (callback: (event: any, shortcut: string) => void) => {
    ipcRenderer.on('global-shortcut', callback)
    return () => ipcRenderer.removeAllListeners('global-shortcut')
  },
  setupWebviewContextMenu: (webContentsId: number) => {
    ipcRenderer.send('setup-webview-context-menu', webContentsId)
  },
  // Enhanced BrowserView API
  createTab: (url?: string) => ipcRenderer.invoke('browser-create-tab', url),
  closeTab: (tabId: number) => ipcRenderer.invoke('browser-close-tab', tabId),
  setActiveTab: (tabId: number) => ipcRenderer.invoke('browser-set-active-tab', tabId),
  navigateTab: (tabId: number, url: string) => ipcRenderer.invoke('browser-navigate-tab', tabId, url),
  tabAction: (tabId: number, action: 'back' | 'forward' | 'reload' | 'stop') => 
    ipcRenderer.invoke('browser-tab-action', tabId, action),
  setTabBounds: (tabId: number, bounds: { x: number; y: number; width: number; height: number }) =>
    ipcRenderer.invoke('browser-set-tab-bounds', tabId, bounds),
  setTabVisible: (tabId: number, visible: boolean) =>
    ipcRenderer.invoke('browser-tab-set-visible', tabId, visible),
  captureTab: (tabId: number) => ipcRenderer.invoke('browser-capture-tab', tabId),
  // Events from tabs
  onTabNavigation: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data)
    ipcRenderer.on('tab-navigation', listener)
    return () => ipcRenderer.removeListener('tab-navigation', listener)
  },
  onTabTitleUpdated: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data)
    ipcRenderer.on('tab-title-updated', listener)
    return () => ipcRenderer.removeListener('tab-title-updated', listener)
  },
  onTabFaviconUpdated: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data)
    ipcRenderer.on('tab-favicon-updated', listener)
    return () => ipcRenderer.removeListener('tab-favicon-updated', listener)
  },
  onTabLoadingState: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data)
    ipcRenderer.on('tab-loading-state', listener)
    return () => ipcRenderer.removeListener('tab-loading-state', listener)
  },
  onTabDownloadStarted: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data)
    ipcRenderer.on('tab-download-started', listener)
    return () => ipcRenderer.removeListener('tab-download-started', listener)
  }
})

// Enhanced secure API for webview access (sandbox compatible)
contextBridge.exposeInMainWorld('electronSecure', {
  // Safe shell operations
  shell: {
    openExternal: (url: string) => {
      // Validate URL before opening
      try {
        const urlObj = new URL(url)
        if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
          return ipcRenderer.invoke('shell-open-external', url)
        }
      } catch (e) {
        console.error('Invalid URL for external open:', url)
      }
    },
    showItemInFolder: (path: string) => {
      return ipcRenderer.invoke('shell-show-item', path)
    }
  },
  // Safe path operations
  path: {
    join: (...paths: string[]) => {
      return ipcRenderer.invoke('path-join', paths)
    },
    homedir: () => {
      return ipcRenderer.invoke('os-homedir')
    }
  }
})

export {}
