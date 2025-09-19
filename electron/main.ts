import { app, BrowserWindow, session, globalShortcut, Menu, ipcMain } from 'electron'
import { setupChromeContextMenu } from './contextMenu'
import * as path from 'node:path'
import * as url from 'node:url'
import 'dotenv/config'

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

// Anti-detection switches to behave more like regular Chrome
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled')
app.commandLine.appendSwitch('disable-web-security')
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor')
// More aggressive anti-detection
app.commandLine.appendSwitch('disable-dev-shm-usage')
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-field-trial-config')
app.commandLine.appendSwitch('disable-ipc-flooding-protection')
app.commandLine.appendSwitch('no-first-run')
app.commandLine.appendSwitch('no-default-browser-check')
app.commandLine.appendSwitch('disable-default-apps')

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Shy Navigator',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: true,
      spellcheck: true,
      enableWebSQL: false
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    titleBarOverlay: process.platform === 'darwin' ? { color: '#ffffff', symbolColor: '#000000', height: 40 } as any : undefined,
    backgroundColor: '#ffffff'
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
  
  // More aggressive session settings to avoid detection
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

  // Remove all Electron traces
  ses.webRequest.onBeforeRequest((details, callback) => {
    // Block requests that might expose Electron
    if (details.url.includes('chrome-extension://') || 
        details.url.includes('devtools://') ||
        details.url.includes('electron://')) {
      callback({ cancel: true })
      return
    }
    callback({})
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

  // Enhanced request headers to avoid bot detection
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = details.requestHeaders
    
    // Set proper Chrome headers to avoid detection
    headers['User-Agent'] = CHROME_UA
    headers['Accept-Language'] = 'en-US,en;q=0.9,fr;q=0.8'
    headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7'
    headers['Accept-Encoding'] = 'gzip, deflate, br'
    headers['Connection'] = 'keep-alive'
    headers['DNT'] = '1'
    
    // Dynamic headers based on navigation type
    if (details.resourceType === 'mainFrame') {
      headers['Cache-Control'] = 'max-age=0'
      headers['Upgrade-Insecure-Requests'] = '1'
      headers['Sec-Fetch-Site'] = details.referrer ? 'same-origin' : 'none'
      headers['Sec-Fetch-Mode'] = 'navigate'
      headers['Sec-Fetch-User'] = '?1'
      headers['Sec-Fetch-Dest'] = 'document'
    }
    
    headers['Sec-Ch-Ua'] = '"Not/A)Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"'
    headers['Sec-Ch-Ua-Mobile'] = '?0'
    headers['Sec-Ch-Ua-Platform'] = '"macOS"'
    headers['Sec-Ch-Ua-Platform-Version'] = '"13.0.0"'
    headers['Sec-Ch-Ua-Full-Version'] = '"127.0.6533.120"'
    
    // Remove any Electron-specific headers
    delete headers['X-Requested-With']
    delete headers['Electron']
    
    callback({ requestHeaders: headers })
  })
  // Appliquer à la fenêtre principale
  const mainWindow = BrowserWindow.getAllWindows()[0]
  if (mainWindow) {
    setupChromeContextMenu(mainWindow.webContents, { isDev })
  }

  // Handler pour les webviews
  ipcMain.on('setup-webview-context-menu', (_event, webContentsId) => {
    try {
      const { webContents } = require('electron')
      const wc = webContents.fromId(webContentsId)
      if (wc) {
        setupChromeContextMenu(wc, { isDev })
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

  // Note: renderer manages tabs via <webview>; no BrowserView IPC required

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
