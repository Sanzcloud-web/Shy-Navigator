import { app, BrowserWindow, session } from 'electron'
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

app.whenReady().then(() => {
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
