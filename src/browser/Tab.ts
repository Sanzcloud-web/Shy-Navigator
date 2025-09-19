// Tab class adapted for React webview integration
import type { TabbedBrowserWindow } from './TabbedBrowserWindow'

export interface TabOptions {
  id: number
  url: string
  reactId: string
  window: TabbedBrowserWindow
}

export interface TabEvents {
  onNavigation?: (url: string, canGoBack: boolean, canGoForward: boolean) => void
  onTitleUpdated?: (title: string) => void
  onFaviconUpdated?: (favicon: string) => void
  onLoadingState?: (isLoading: boolean) => void
  onDownloadStarted?: (filename: string, url: string, totalBytes: number) => void
}

export class Tab {
  public readonly id: number
  public readonly reactId: string
  private readonly window: TabbedBrowserWindow
  private _url: string = ''
  private _title: string = 'New Tab'
  private _favicon: string = ''
  private _isLoading: boolean = false
  private _webviewElement: HTMLWebViewElement | null = null
  private events: TabEvents = {}

  constructor(options: TabOptions) {
    this.id = options.id
    this.reactId = options.reactId
    this.window = options.window
    this._url = options.url
  }

  // Set the webview element when React component mounts
  public setWebviewElement(element: HTMLWebViewElement, events: TabEvents = {}) {
    this._webviewElement = element
    this.events = events
    this.setupWebviewEvents()
    // Do not auto-call loadURL here; <webview src> already drives navigation.
    // Auto-calling can race with attribute-based navigation and cause ERR_ABORTED.
  }

  private setupWebviewEvents() {
    if (!this._webviewElement) return

    const wv = this._webviewElement

    // Navigation events
    const onNav = () => {
      try {
        const url = (wv as any).getURL?.() || wv.getAttribute('src') || this._url
        this._url = url
        const canGoBack = (wv as any).canGoBack?.() || false
        const canGoForward = (wv as any).canGoForward?.() || false
        this.events.onNavigation?.(url, canGoBack, canGoForward)
      } catch (error) {
        console.warn('Navigation event error:', error)
      }
    }

    // Title updates
    const onTitle = (e: any) => {
      const title = e.title || 'Untitled'
      this._title = title
      this.events.onTitleUpdated?.(title)
    }

    // Loading state
    const onLoadStart = () => {
      this._isLoading = true
      this.events.onLoadingState?.(true)
    }

    const onLoadStop = () => {
      this._isLoading = false
      this.events.onLoadingState?.(false)
    }

    // Download handling
    const onDownload = (e: any) => {
      if (e.item && this.events.onDownloadStarted) {
        const filename = e.item.getFilename() || 'download'
        const url = e.item.getURL() || ''
        const size = e.item.getTotalBytes() || 0
        this.events.onDownloadStarted(filename, url, size)
      }
    }

    // Context menu setup and anti-detection
    const onDomReady = () => {
      try {
        const webContents = (wv as any).getWebContents?.()
        if (webContents) {
          // Setup context menu (handled in main via common helper)
          const electronAPI = (window as any).electronAPI
          try { electronAPI?.setupWebviewContextMenu?.(webContents.id) } catch {}

          // Anti-detection: Complete stealth mode
          webContents.executeJavaScript(`
            // Remove webdriver property
            Object.defineProperty(navigator, 'webdriver', {
              get: () => undefined,
            });
            
            // Remove Electron/automation indicators
            delete window.chrome;
            delete window.electron;
            delete window.__nightmare;
            delete window._phantom;
            delete window.callPhantom;
            delete window.Buffer;
            delete window.process;
            delete window.global;
            
            // Override Object.getOwnPropertyDescriptor to hide webdriver
            const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
            Object.getOwnPropertyDescriptor = function(obj, prop) {
              if (prop === 'webdriver') {
                return undefined;
              }
              return originalGetOwnPropertyDescriptor(obj, prop);
            };
            
            // Mock Chrome object
            window.chrome = {
              runtime: {},
              loadTimes: function() {
                return {
                  commitLoadTime: Date.now() / 1000 - Math.random(),
                  finishDocumentLoadTime: Date.now() / 1000 - Math.random(),
                  finishLoadTime: Date.now() / 1000 - Math.random(),
                  firstPaintAfterLoadTime: 0,
                  firstPaintTime: Date.now() / 1000 - Math.random(),
                  navigationType: 'Other',
                  npnNegotiatedProtocol: 'h2',
                  requestTime: Date.now() / 1000 - Math.random(),
                  startLoadTime: Date.now() / 1000 - Math.random(),
                  wasAlternateProtocolAvailable: false,
                  wasFetchedViaSpdy: true,
                  wasNpnNegotiated: true
                };
              },
              csi: function() {
                return {
                  onloadT: Date.now(),
                  pageT: Date.now() - performance.timing.navigationStart,
                  startE: performance.timing.navigationStart,
                  tran: 15
                };
              }
            };
            
            // Override permissions query
            if (navigator.permissions && navigator.permissions.query) {
              const originalQuery = navigator.permissions.query;
              navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                  Promise.resolve({ state: Notification.permission }) :
                  originalQuery(parameters)
              );
            }
            
            // Mock plugins array
            Object.defineProperty(navigator, 'plugins', {
              get: () => [
                {
                  0: {
                    type: "application/x-google-chrome-pdf",
                    suffixes: "pdf",
                    description: "Portable Document Format",
                    enabledPlugin: Plugin
                  },
                  description: "Portable Document Format",
                  filename: "internal-pdf-viewer",
                  length: 1,
                  name: "Chrome PDF Plugin"
                },
                {
                  0: {
                    type: "application/pdf",
                    suffixes: "pdf", 
                    description: "",
                    enabledPlugin: Plugin
                  },
                  description: "",
                  filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
                  length: 1,
                  name: "Chrome PDF Viewer"
                }
              ]
            });
            
            console.log('Anti-detection script loaded successfully');
          `)
        }
      } catch (error) {
        console.log('Context menu setup or anti-detection failed:', error)
      }
    }

    // Favicon updates
    const onFavicon = (e: any) => {
      if (e.favicons && e.favicons.length > 0) {
        this._favicon = e.favicons[0]
        this.events.onFaviconUpdated?.(this._favicon)
      }
    }

    // Attach all event listeners
    wv.addEventListener('did-navigate', onNav as any)
    wv.addEventListener('did-navigate-in-page', onNav as any)
    wv.addEventListener('page-title-updated', onTitle as any)
    wv.addEventListener('did-start-loading', onLoadStart as any)
    wv.addEventListener('did-stop-loading', onLoadStop as any)
    wv.addEventListener('will-download', onDownload as any)
    wv.addEventListener('dom-ready', onDomReady as any)
    wv.addEventListener('page-favicon-updated', onFavicon as any)

    // Store cleanup function
    this._cleanup = () => {
      wv.removeEventListener('did-navigate', onNav as any)
      wv.removeEventListener('did-navigate-in-page', onNav as any)
      wv.removeEventListener('page-title-updated', onTitle as any)
      wv.removeEventListener('did-start-loading', onLoadStart as any)
      wv.removeEventListener('did-stop-loading', onLoadStop as any)
      wv.removeEventListener('will-download', onDownload as any)
      wv.removeEventListener('dom-ready', onDomReady as any)
      wv.removeEventListener('page-favicon-updated', onFavicon as any)
    }
  }

  private _cleanup: (() => void) | null = null

  public show() {
    // Tab is shown - webview is already visible in React
    console.log(`Tab ${this.id} shown`)
  }

  public hide() {
    // Tab is hidden - handled by React component unmounting/mounting
    console.log(`Tab ${this.id} hidden`)
  }

  public loadURL(url: string) {
    // Avoid redundant navigations
    if (url === this._url) return
    this._url = url
    if (this._webviewElement) {
      try {
        const currentUrl = (this._webviewElement as any).getURL?.() || this._webviewElement.getAttribute('src') || ''
        if (currentUrl === url) return
        if ((this._webviewElement as any).loadURL) {
          (this._webviewElement as any).loadURL(url)
        } else {
          this._webviewElement.src = url
        }
      } catch (error) {
        console.warn('Failed to load URL:', error)
        try { this._webviewElement.src = url } catch {}
      }
    }
  }

  public goBack() {
    if (this._webviewElement && (this._webviewElement as any).canGoBack?.()) {
      (this._webviewElement as any).goBack?.()
    }
  }

  public goForward() {
    if (this._webviewElement && (this._webviewElement as any).canGoForward?.()) {
      (this._webviewElement as any).goForward?.()
    }
  }

  public reload() {
    if (this._webviewElement) {
      (this._webviewElement as any).reload?.()
    }
  }

  public stop() {
    if (this._webviewElement) {
      (this._webviewElement as any).stop?.()
    }
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
    if (this._cleanup) {
      this._cleanup()
      this._cleanup = null
    }
    this._webviewElement = null
  }
}
