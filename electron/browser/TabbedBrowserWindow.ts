import { BrowserWindow, BrowserView, session, WebContents } from 'electron'
import { Tab } from './Tab'

export interface TabbedBrowserWindowOptions {
  window: Electron.BrowserWindowConstructorOptions
  session?: Electron.Session
}

export class TabbedBrowserWindow {
  public window: BrowserWindow
  public tabs: Tab[] = []
  public activeTab: Tab | null = null
  public session: Electron.Session
  private tabIdCounter = 1

  constructor(options: TabbedBrowserWindowOptions) {
    this.session = options.session || session.defaultSession
    
    this.window = new BrowserWindow({
      ...options.window,
      webPreferences: {
        ...options.window.webPreferences,
        session: this.session,
      },
    })

    this.setupWindowEvents()
  }

  private setupWindowEvents() {
    this.window.on('closed', () => {
      // Cleanup all tabs when window is closed
      this.tabs.forEach(tab => tab.destroy())
      this.tabs = []
    })

    this.window.on('resize', () => {
      // Resize active tab to match window
      if (this.activeTab) {
        this.activeTab.updateBounds()
      }
    })

    this.window.on('focus', () => {
      // Focus the active tab's webContents
      if (this.activeTab) {
        this.activeTab.view.webContents.focus()
      }
    })
  }

  public createTab(url?: string): Tab {
    const id = this.tabIdCounter++
    const tab = new Tab({
      id,
      url: url || 'about:blank',
      window: this,
      session: this.session
    })

    this.tabs.push(tab)
    
    // If this is the first tab, make it active
    if (this.tabs.length === 1) {
      this.setActiveTab(tab)
    }

    return tab
  }

  public setActiveTab(tab: Tab) {
    // Hide current active tab
    if (this.activeTab && this.activeTab !== tab) {
      this.activeTab.hide()
    }

    this.activeTab = tab
    tab.show()
    
    // Focus the tab's webContents
    tab.view.webContents.focus()
  }

  public closeTab(tabId: number): boolean {
    const tabIndex = this.tabs.findIndex(tab => tab.id === tabId)
    if (tabIndex === -1) return false

    const tab = this.tabs[tabIndex]
    const wasActive = this.activeTab === tab

    // Remove from array
    this.tabs.splice(tabIndex, 1)

    // Destroy the tab
    tab.destroy()

    // If this was the active tab, activate another one
    if (wasActive) {
      if (this.tabs.length > 0) {
        // Activate the next tab, or previous if this was the last one
        const nextTab = this.tabs[Math.min(tabIndex, this.tabs.length - 1)]
        this.setActiveTab(nextTab)
      } else {
        this.activeTab = null
      }
    }

    return true
  }

  public getTabById(id: number): Tab | undefined {
    return this.tabs.find(tab => tab.id === id)
  }

  public getAllTabs(): Tab[] {
    return [...this.tabs]
  }

  public getActiveTab(): Tab | null {
    return this.activeTab
  }

  public destroy() {
    // Destroy all tabs
    this.tabs.forEach(tab => tab.destroy())
    this.tabs = []
    this.activeTab = null
    
    // Destroy the window
    if (!this.window.isDestroyed()) {
      this.window.destroy()
    }
  }
}