// TabbedBrowserWindow adapted for React integration
import { Tab, TabOptions } from './Tab'

export interface TabbedBrowserWindowOptions {
  onTabCreated?: (tab: Tab) => void
  onTabClosed?: (tabId: number) => void
  onActiveTabChanged?: (tab: Tab) => void
}

export class TabbedBrowserWindow {
  public tabs: Tab[] = []
  public activeTab: Tab | null = null
  private tabIdCounter = 1
  private options: TabbedBrowserWindowOptions

  constructor(options: TabbedBrowserWindowOptions = {}) {
    this.options = options
  }

  public createTab(url?: string, reactId?: string): Tab {
    const id = this.tabIdCounter++
    const tab = new Tab({
      id,
      url: url || 'about:blank',
      reactId: reactId || crypto.randomUUID(),
      window: this
    })

    this.tabs.push(tab)
    
    // If this is the first tab, make it active
    if (this.tabs.length === 1) {
      this.setActiveTab(tab)
    }

    this.options.onTabCreated?.(tab)
    return tab
  }

  public setActiveTab(tab: Tab) {
    // Hide current active tab
    if (this.activeTab && this.activeTab !== tab) {
      this.activeTab.hide()
    }

    this.activeTab = tab
    tab.show()
    
    this.options.onActiveTabChanged?.(tab)
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
    this.options.onTabClosed?.(tabId)

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

  public getTabByReactId(reactId: string): Tab | undefined {
    return this.tabs.find(tab => tab.reactId === reactId)
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
  }
}