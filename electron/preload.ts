import { contextBridge } from 'electron'

// Expose a minimal API if needed later
contextBridge.exposeInMainWorld('shy', {
  version: '0.1.0'
})

export {}

