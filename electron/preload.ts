import { contextBridge, ipcRenderer } from 'electron'

// Expose a minimal API if needed later
contextBridge.exposeInMainWorld('shy', {
  version: '0.1.0',
  onDownloadStarted: (cb: (payload: { filename: string; url: string; totalBytes: number }) => void) => {
    const listener = (_: any, payload: { filename: string; url: string; totalBytes: number }) => cb(payload)
    ipcRenderer.on('shy:download-started', listener)
    return () => ipcRenderer.removeListener('shy:download-started', listener)
  }
})

export {}
