import { app, BrowserWindow, session, globalShortcut, Menu, ipcMain } from 'electron'
import * as path from 'node:path'
import * as url from 'node:url'
import 'dotenv/config'
import { TabbedBrowserWindow } from './browser/TabbedBrowserWindow'

const isDev = !!process.env.VITE_DEV_SERVER_URL

// Enhanced Chrome User Agent masking (based on Quark-Browser)
const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
app.userAgentFallback = CHROME_UA

// Performance and feature command line switches (from Quark-Browser)
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder')
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('enable-hardware-overlays')
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers')
app.commandLine.appendSwitch('enable-gpu-memory-buffer-compositor-resources')
app.commandLine.appendSwitch('num-raster-threads', '4')
app.commandLine.appendSwitch('enable-main-frame-before-activation')
app.commandLine.appendSwitch('enable-surface-synchronization')

// Global browser windows storage
let browserWindows: TabbedBrowserWindow[] = []

function createWindow() {
  // Create tabbed browser window with enhanced architecture
  const tabbedWindow = new TabbedBrowserWindow({
    window: {
      width: 1200,
      height: 800,
      title: 'Shy Navigator',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: true,
        spellcheck: true,
        enableWebSQL: false
      },
      // Style de barre de titre light - GARDE LE DESIGN ORIGINAL
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      titleBarOverlay: process.platform === 'darwin' ? { color: '#ffffff', symbolColor: '#000000', height: 40 } as any : undefined,
      backgroundColor: '#ffffff'
    },
    session: session.defaultSession
  })
  
  // Add to global storage
  browserWindows.push(tabbedWindow)
  
  // Reference for compatibility with existing code
  const win = tabbedWindow.window
  
  // Setup window cleanup
  win.on('closed', () => {
    const index = browserWindows.findIndex(bw => bw.window === win)
    if (index !== -1) {
      browserWindows[index].destroy()
      browserWindows.splice(index, 1)
    }
  })

  // Build and set a basic app menu with useful roles and accelerators
  const isMac = process.platform === 'darwin'
  const template: any[] = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab / Command Palette',
          accelerator: 'CmdOrCtrl+T',
          click: () => win.webContents.send('shy:accelerator', { type: 'open-palette' })
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' },
        ])
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+S',
          click: () => win.webContents.send('shy:accelerator', { type: 'toggle-sidebar' })
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      role: 'window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'windowMenu' }
        ] : [
          { role: 'close' }
        ])
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  // Renderer can request to show the app menu at cursor/pos
  ipcMain.on('shy:open-app-menu', (_evt, pos?: { x: number; y: number }) => {
    const browserWindow = BrowserWindow.fromWebContents(_evt.sender)
    if (!browserWindow) return
    menu.popup({
      window: browserWindow,
      x: pos?.x ? Math.round(pos.x) : undefined,
      y: pos?.y ? Math.round(pos.y) : undefined
    })
  })

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL!)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    const indexURL = url.pathToFileURL(path.join(__dirname, '../dist/index.html')).toString()
    win.loadURL(indexURL)
  }
}

// macOS: recreate a window when the dock icon is clicked
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.whenReady().then(async () => {
  // Enhanced session configuration (based on Quark-Browser)
  const ses = session.defaultSession
  
  // Remove Electron branding from user agent for better compatibility
  ses.setUserAgent(CHROME_UA)
  
  // Performance and security settings
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = [
      'notifications',
      'geolocation', 
      'media',
      'camera',
      'microphone',
      'clipboard-read',
      'clipboard-sanitized-write'
    ]
    callback(allowedPermissions.includes(permission))
  })
  
  // Security headers
  ses.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'X-Frame-Options': ['SAMEORIGIN'],
        'X-Content-Type-Options': ['nosniff'],
        'Referrer-Policy': ['strict-origin-when-cross-origin']
      }
    })
  })
  // Configuration native du menu contextuel pour toutes les webContents
  const setupNativeContextMenu = (webContents: any) => {
    webContents.on('context-menu', (_event: any, params: any) => {
      const { Menu, MenuItem } = require('electron')
      const menu = new Menu()

      // Cut
      if (params.editFlags.canCut) {
        menu.append(new MenuItem({
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          click: () => webContents.cut()
        }))
      }

      // Copy
      if (params.editFlags.canCopy) {
        menu.append(new MenuItem({
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          click: () => webContents.copy()
        }))
      }

      // Paste
      if (params.editFlags.canPaste) {
        menu.append(new MenuItem({
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          click: () => webContents.paste()
        }))
      }

      // Select All
      if (params.editFlags.canSelectAll) {
        menu.append(new MenuItem({ type: 'separator' }))
        menu.append(new MenuItem({
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          click: () => webContents.selectAll()
        }))
      }

      // Image actions
      if (params.mediaType === 'image') {
        menu.append(new MenuItem({ type: 'separator' }))
        menu.append(new MenuItem({
          label: 'Copy Image',
          click: () => webContents.copyImageAt(params.x, params.y)
        }))
        menu.append(new MenuItem({
          label: 'Copy Image Address',
          click: () => {
            require('electron').clipboard.writeText(params.srcURL)
          }
        }))
      }

      // Link actions
      if (params.linkURL) {
        menu.append(new MenuItem({ type: 'separator' }))
        menu.append(new MenuItem({
          label: 'Copy Link',
          click: () => {
            require('electron').clipboard.writeText(params.linkURL)
          }
        }))
      }

      // Search with Google
      if (params.selectionText) {
        menu.append(new MenuItem({ type: 'separator' }))
        menu.append(new MenuItem({
          label: `Search Google for "${params.selectionText.substring(0, 20)}${params.selectionText.length > 20 ? '...' : ''}"`,
          click: () => {
            require('electron').shell.openExternal(`https://www.google.com/search?q=${encodeURIComponent(params.selectionText)}`)
          }
        }))
      }

      // Inspect Element (dev only)
      if (isDev) {
        menu.append(new MenuItem({ type: 'separator' }))
        menu.append(new MenuItem({
          label: 'Inspect Element',
          click: () => webContents.inspectElement(params.x, params.y)
        }))
      }

      if (menu.items.length > 0) {
        menu.popup()
      }
    })
  }

  // Appliquer à la fenêtre principale
  const mainWindow = BrowserWindow.getAllWindows()[0]
  if (mainWindow) {
    setupNativeContextMenu(mainWindow.webContents)
  }

  // Handler pour les webviews
  ipcMain.on('setup-webview-context-menu', (_event, webContentsId) => {
    try {
      const { webContents } = require('electron')
      const wc = webContents.fromId(webContentsId)
      if (wc) {
        setupNativeContextMenu(wc)
        console.log('✅ Native context menu setup for webview:', webContentsId)
      }
    } catch (error) {
      console.error('❌ Failed to setup context menu for webview:', error)
    }
  })

  // Secure IPC handlers for sandbox environment
  ipcMain.handle('shell-open-external', async (_event, url: string) => {
    const { shell } = require('electron')
    return shell.openExternal(url)
  })

  ipcMain.handle('shell-show-item', async (_event, fullPath: string) => {
    const { shell } = require('electron')
    return shell.showItemInFolder(fullPath)
  })

  ipcMain.handle('path-join', async (_event, paths: string[]) => {
    const path = require('path')
    return path.join(...paths)
  })

  ipcMain.handle('os-homedir', async (_event) => {
    const os = require('os')
    return os.homedir()
  })

  // Enhanced BrowserView integration IPC handlers (garde l'interface React)
  ipcMain.handle('browser-create-tab', async (event, url?: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null
    
    const tabbedWindow = browserWindows.find(bw => bw.window === win)
    if (!tabbedWindow) return null
    
    const tab = tabbedWindow.createTab(url)
    return {
      id: tab.id,
      url: tab.url,
      title: tab.title,
      favicon: tab.favicon
    }
  })
  
  ipcMain.handle('browser-close-tab', async (event, tabId: number) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return false
    
    const tabbedWindow = browserWindows.find(bw => bw.window === win)
    if (!tabbedWindow) return false
    
    return tabbedWindow.closeTab(tabId)
  })
  
  ipcMain.handle('browser-set-active-tab', async (event, tabId: number) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return false
    
    const tabbedWindow = browserWindows.find(bw => bw.window === win)
    if (!tabbedWindow) return false
    
    const tab = tabbedWindow.getTabById(tabId)
    if (!tab) return false
    
    tabbedWindow.setActiveTab(tab)
    return true
  })
  
  ipcMain.handle('browser-navigate-tab', async (event, tabId: number, url: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return false
    
    const tabbedWindow = browserWindows.find(bw => bw.window === win)
    if (!tabbedWindow) return false
    
    const tab = tabbedWindow.getTabById(tabId)
    if (!tab) return false
    
    tab.loadURL(url)
    return true
  })
  
  ipcMain.handle('browser-tab-action', async (event, tabId: number, action: 'back' | 'forward' | 'reload' | 'stop') => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return false
    
    const tabbedWindow = browserWindows.find(bw => bw.window === win)
    if (!tabbedWindow) return false
    
    const tab = tabbedWindow.getTabById(tabId)
    if (!tab) return false
    
    switch (action) {
      case 'back': tab.goBack(); break
      case 'forward': tab.goForward(); break
      case 'reload': tab.reload(); break
      case 'stop': tab.stop(); break
    }
    return true
  })
  
  ipcMain.handle('browser-get-all-tabs', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return []
    
    const tabbedWindow = browserWindows.find(bw => bw.window === win)
    if (!tabbedWindow) return []
    
    return tabbedWindow.getAllTabs().map(tab => ({
      id: tab.id,
      url: tab.url,
      title: tab.title,
      favicon: tab.favicon,
      isLoading: tab.isLoading,
      isActive: tabbedWindow.getActiveTab() === tab
    }))
  })

  console.log('✅ Native context menu configured successfully')

  // Enregistrer les shortcuts globaux pour qu'ils fonctionnent même dans les webviews
  globalShortcut.register('CommandOrControl+T', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      focusedWindow.webContents.send('global-shortcut', 'cmd+t')
    }
  })

  globalShortcut.register('CommandOrControl+S', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      focusedWindow.webContents.send('global-shortcut', 'cmd+s')
    }
  })

  // Ecouter les téléchargements pour toutes les webContents, y compris <webview>
  session.defaultSession.on('will-download', (_event, item, webContents) => {
    try {
      const payload = {
        filename: item.getFilename(),
        url: item.getURL(),
        totalBytes: item.getTotalBytes(),
      }
      webContents.send('shy:download-started', payload)
    } catch (e) {
      // pas bloquant
    }
  })

  createWindow()
})

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Nettoyer les shortcuts globaux quand l'app se ferme
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
