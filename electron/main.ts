import { app, BrowserWindow, session, globalShortcut, Menu, ipcMain } from 'electron'
import * as path from 'node:path'
import * as url from 'node:url'
import 'dotenv/config'

const isDev = !!process.env.VITE_DEV_SERVER_URL

// Masquer l'UA Electron pour réduire les pages "Sorry" et les captchas
const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
app.userAgentFallback = CHROME_UA

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Shy Navigator',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true
    },
    // Style de barre de titre light
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
  // Configurer le menu contextuel pour tous les webContents (y compris webview)
  try {
    const { default: contextMenu } = await import('electron-context-menu')
    contextMenu({
      showSaveImageAs: true,
      showCopyImage: true,
      showCopyImageAddress: true,
      showSaveImage: true,
      showCopyLink: true,
      showSaveLinkAs: true,
      showSearchWithGoogle: true,
      showLookUpSelection: true,
      showInspectElement: isDev, // Seulement en développement
      showServices: process.platform === 'darwin' // Services menu sur macOS seulement
    })
  } catch (error) {
    console.log('Context menu setup error:', error)
  }

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
