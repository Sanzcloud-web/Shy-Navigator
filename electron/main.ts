import { app, BrowserWindow } from 'electron'
import * as path from 'node:path'
import * as url from 'node:url'

const isDev = !!process.env.VITE_DEV_SERVER_URL

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
    }
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

app.whenReady().then(createWindow)

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

