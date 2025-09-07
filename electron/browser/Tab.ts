import { BrowserView, session, WebContents, ipcMain } from 'electron'
import type { TabbedBrowserWindow } from './TabbedBrowserWindow'

export interface TabOptions {
  id: number
  url: string
  window: TabbedBrowserWindow
  session?: Electron.Session
}

export class Tab {
  public readonly id: number
  public readonly view: BrowserView
  public readonly webContents: WebContents
  private readonly window: TabbedBrowserWindow
  private _url: string = ''
  private _title: string = 'New Tab'
  private _favicon: string = ''
  private _isLoading: boolean = false

  constructor(options: TabOptions) {
    this.id = options.id
    this.window = options.window
    this._url = options.url

    // Create BrowserView with security settings
    this.view = new BrowserView({
      webPreferences: {
        session: options.session || session.defaultSession,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        allowRunningInsecureContent: false,
        experimentalFeatures: true,
        spellcheck: true,
        enableWebSQL: false,
      }
    })

    this.webContents = this.view.webContents
    
    // Add the view to the window
    this.window.window.addBrowserView(this.view)
    
    // Setup event listeners
    this.setupWebContentsEvents()
    
    // Initially hide the tab
    this.hide()
    
    // Load initial URL
    if (options.url && options.url !== 'about:blank') {
      this.loadURL(options.url)
    }
  }

  private setupWebContentsEvents() {
    // Navigation events
    this.webContents.on('did-navigate', (event, url) => {
      this._url = url
      this.window.window.webContents.send('tab-navigation', {
        tabId: this.id,
        url,
        canGoBack: this.webContents.canGoBack(),
        canGoForward: this.webContents.canGoForward()
      })
    })

    // Title updates
    this.webContents.on('page-title-updated', (event, title) => {
      this._title = title
      this.window.window.webContents.send('tab-title-updated', {
        tabId: this.id,
        title
      })
    })

    // Favicon updates
    this.webContents.on('page-favicon-updated', (event, favicons) => {
      this._favicon = favicons[0] || ''
      this.window.window.webContents.send('tab-favicon-updated', {
        tabId: this.id,
        favicon: this._favicon
      })
    })

    // Loading state
    this.webContents.on('did-start-loading', () => {
      this._isLoading = true
      this.window.window.webContents.send('tab-loading-state', {
        tabId: this.id,
        isLoading: true
      })
    })

    this.webContents.on('did-stop-loading', () => {
      this._isLoading = false
      this.window.window.webContents.send('tab-loading-state', {
        tabId: this.id,
        isLoading: false
      })
    })

    // Download handling
    this.webContents.session.on('will-download', (event, item, webContents) => {
      const payload = {
        tabId: this.id,
        filename: item.getFilename(),
        url: item.getURL(),
        totalBytes: item.getTotalBytes(),
      }
      this.window.window.webContents.send('tab-download-started', payload)
    })

    // New window handling
    this.webContents.setWindowOpenHandler(({ url, frameName, features }) => {
      // Create a new tab for popup windows
      const newTab = this.window.createTab(url)
      this.window.setActiveTab(newTab)
      return { action: 'deny' } // Prevent default popup window
    })

    // Context menu setup
    this.webContents.on('context-menu', (event, params) => {
      const { Menu, MenuItem } = require('electron')
      const menu = new Menu()

      // Standard context menu items based on context
      if (params.editFlags.canCut) {
        menu.append(new MenuItem({
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          click: () => this.webContents.cut()
        }))
      }

      if (params.editFlags.canCopy) {
        menu.append(new MenuItem({
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          click: () => this.webContents.copy()
        }))
      }

      if (params.editFlags.canPaste) {
        menu.append(new MenuItem({
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          click: () => this.webContents.paste()
        }))
      }

      if (params.editFlags.canSelectAll) {
        menu.append(new MenuItem({ type: 'separator' }))
        menu.append(new MenuItem({
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          click: () => this.webContents.selectAll()
        }))
      }

      // Link context menu
      if (params.linkURL) {
        menu.append(new MenuItem({ type: 'separator' }))
        menu.append(new MenuItem({
          label: 'Open Link in New Tab',
          click: () => {
            const newTab = this.window.createTab(params.linkURL)
            this.window.setActiveTab(newTab)
          }
        }))
        menu.append(new MenuItem({
          label: 'Copy Link Address',
          click: () => {
            require('electron').clipboard.writeText(params.linkURL)
          }
        }))
      }

      // Image context menu
      if (params.mediaType === 'image') {
        menu.append(new MenuItem({ type: 'separator' }))
        menu.append(new MenuItem({
          label: 'Copy Image',
          click: () => this.webContents.copyImageAt(params.x, params.y)
        }))
        menu.append(new MenuItem({
          label: 'Copy Image Address',
          click: () => {
            require('electron').clipboard.writeText(params.srcURL)
          }
        }))
      }

      // Search selected text
      if (params.selectionText) {
        menu.append(new MenuItem({ type: 'separator' }))
        menu.append(new MenuItem({
          label: `Search Google for "${params.selectionText.substring(0, 20)}${params.selectionText.length > 20 ? '...' : ''}"`,
          click: () => {
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(params.selectionText)}`
            const newTab = this.window.createTab(searchUrl)
            this.window.setActiveTab(newTab)
          }
        }))
      }

      // Developer tools
      if (process.env.NODE_ENV === 'development') {
        menu.append(new MenuItem({ type: 'separator' }))
        menu.append(new MenuItem({
          label: 'Inspect Element',
          click: () => this.webContents.inspectElement(params.x, params.y)
        }))
      }

      if (menu.items.length > 0) {
        menu.popup({ window: this.window.window })
      }
    })
  }

  public show() {
    // Bring to front; bounds are managed from renderer via IPC (browser-set-tab-bounds)
    this.window.window.setTopBrowserView(this.view)
  }

  public hide() {
    // Move off-screen instead of removing
    this.view.setBounds({ 
      x: -1000, 
      y: -1000, 
      width: 1, 
      height: 1 
    })
  }

  public updateBounds() {
    if (this.window.activeTab === this) {
      this.show()
    }
  }

  public loadURL(url: string) {
    this._url = url
    this.webContents.loadURL(url).catch(err => {
      console.error('Failed to load URL:', url, err)
    })
  }

  public goBack() {
    if (this.webContents.canGoBack()) {
      this.webContents.goBack()
    }
  }

  public goForward() {
    if (this.webContents.canGoForward()) {
      this.webContents.goForward()
    }
  }

  public reload() {
    this.webContents.reload()
  }

  public stop() {
    this.webContents.stop()
  }

  // Getters
  public get url(): string {
    return this._url
  }

  public get title(): string {
    return this._title
  }

  public get favicon(): string {
    return this._favicon
  }

  public get isLoading(): boolean {
    return this._isLoading
  }

  public destroy() {
    // Remove from window
    this.window.window.removeBrowserView(this.view)
    
    // Note: webContents cleanup is handled automatically by BrowserView destruction
  }
}
