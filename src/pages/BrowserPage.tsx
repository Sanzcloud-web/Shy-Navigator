import { useEffect, useMemo, useRef, useState } from 'react'
import BrowserView from '../components/BrowserView'
import Sidebar, { type Tab } from '../components/Sidebar'
import CommandPalette from '../components/CommandPalette'
import ContextMenu, { createAppMenuItems, type MenuPosition } from '../components/ContextMenu'
import { normalizeUrl } from '../lib/url'
import { getFaviconUrl } from '../lib/favicon'
import TopBar from '../components/TopBar'
import { useTheme } from '../hooks/useTheme'
import { Moon, Sun } from 'lucide-react'
import type { HistoryEntry } from '../components/ArchiveView'
import type { DownloadEntry, NavigationCategory } from '../components/NavigationView'

// Enhanced Tab interface with BrowserView integration
interface EnhancedTab extends Tab {
  browserViewId?: number
  isLoading?: boolean
}

// BrowserView Tab management
class BrowserTabManager {
  private tabs: Map<string, any> = new Map() // React ID -> BrowserView Tab
  private tabIdCounter = 1
  
  async createTab(url: string, reactId: string): Promise<number | null> {
    try {
      const electronAPI = (window as any).electronAPI
      if (!electronAPI?.createTab) return null
      
      const browserViewTab = await electronAPI.createTab(url)
      if (browserViewTab) {
        this.tabs.set(reactId, { ...browserViewTab, reactId })
        return browserViewTab.id
      }
    } catch (error) {
      console.error('Failed to create BrowserView tab:', error)
    }
    return null
  }
  
  async closeTab(reactId: string): Promise<boolean> {
    const tab = this.tabs.get(reactId)
    if (!tab) return false
    
    try {
      const electronAPI = (window as any).electronAPI
      if (electronAPI?.closeTab) {
        await electronAPI.closeTab(tab.id)
      }
      this.tabs.delete(reactId)
      return true
    } catch (error) {
      console.error('Failed to close BrowserView tab:', error)
      return false
    }
  }
  
  async setActiveTab(reactId: string): Promise<boolean> {
    const tab = this.tabs.get(reactId)
    if (!tab) return false
    
    try {
      const electronAPI = (window as any).electronAPI
      if (electronAPI?.setActiveTab) {
        await electronAPI.setActiveTab(tab.id)
        return true
      }
    } catch (error) {
      console.error('Failed to set active BrowserView tab:', error)
    }
    return false
  }
  
  async navigateTab(reactId: string, url: string): Promise<boolean> {
    const tab = this.tabs.get(reactId)
    if (!tab) return false
    
    try {
      const electronAPI = (window as any).electronAPI
      if (electronAPI?.navigateTab) {
        await electronAPI.navigateTab(tab.id, url)
        return true
      }
    } catch (error) {
      console.error('Failed to navigate BrowserView tab:', error)
    }
    return false
  }
  
  getBrowserViewId(reactId: string): number | null {
    const tab = this.tabs.get(reactId)
    return tab?.id || null
  }
}

export default function BrowserPage() {
  const [tabs, setTabs] = useState<EnhancedTab[]>([])
  const [activeId, setActiveId] = useState<string | undefined>(undefined)
  const [collapsed, setCollapsed] = useState(false)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [titleMap, setTitleMap] = useState<Record<string, string>>({})
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [showNavigation, setShowNavigation] = useState(false)
  const [navigationCategory, setNavigationCategory] = useState<NavigationCategory>('history')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [downloads, setDownloads] = useState<DownloadEntry[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ x: 0, y: 0 })
  const webviewRef = useRef<any>(null)
  const { isDark, toggleTheme } = useTheme()
  
  // BrowserView integration
  const browserTabManager = useRef(new BrowserTabManager())
  const [activeBrowserViewId, setActiveBrowserViewId] = useState<number | null>(null)

  const activeTab = useMemo(() => tabs.find(t => t.id === activeId), [tabs, activeId])

  async function openTab(url?: string) {
    const u = normalizeUrl(url || '')
    const id = crypto.randomUUID()
    const favicon = getFaviconUrl(u)
    console.log('📂 openTab - URL:', u, 'Favicon:', favicon)
    
    // Create BrowserView tab in background
    const browserViewId = await browserTabManager.current.createTab(u, id)
    
    const t: EnhancedTab = { 
      id, 
      url: u, 
      title: 'New Tab', 
      favicon,
      browserViewId: browserViewId || undefined,
      isLoading: false
    }
    
    setTabs(prev => [t, ...prev])
    setActiveId(id)
    
    // Set as active BrowserView
    if (browserViewId) {
      await browserTabManager.current.setActiveTab(id)
      setActiveBrowserViewId(browserViewId)
    }
    
    // Ajouter à l'historique
    if (url && url.trim()) {
      addToHistory(u)
    }
  }

  async function closeTab(id: string) {
    // Close BrowserView tab
    await browserTabManager.current.closeTab(id)
    
    // Update React state
    setTabs(prev => prev.filter(t => t.id !== id))
    if (activeId === id) {
      const rest = tabs.filter(t => t.id !== id)
      const nextTab = rest[0]
      setActiveId(nextTab?.id)
      
      // Set next tab as active in BrowserView
      if (nextTab?.browserViewId) {
        await browserTabManager.current.setActiveTab(nextTab.id)
        setActiveBrowserViewId(nextTab.browserViewId)
      } else {
        setActiveBrowserViewId(null)
      }
      
      if (rest.length === 0) setPaletteOpen(true)
    }
  }

  async function navigateCurrent(url: string) {
    if (!activeId) { openTab(url); return }
    const u = normalizeUrl(url)
    
    // Navigate BrowserView tab
    await browserTabManager.current.navigateTab(activeId, u)
    
    // Update React state
    setTabs(prev => prev.map(t => t.id === activeId ? { ...t, url: u, favicon: getFaviconUrl(u) } : t))
    
    // Ajouter à l'historique
    addToHistory(u)
  }

  function addToHistory(url: string, title?: string) {
    const historyEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      title: title || new URL(url).hostname,
      url,
      favicon: getFaviconUrl(url),
      visitedAt: new Date()
    }
    
    setHistory(prev => {
      // Éviter les doublons récents (même URL dans les 5 dernières minutes)
      const recentDuplicate = prev.find(entry => 
        entry.url === url && 
        Date.now() - entry.visitedAt.getTime() < 5 * 60 * 1000
      )
      
      if (recentDuplicate) return prev
      
      // Ajouter au début et limiter à 1000 entrées
      return [historyEntry, ...prev].slice(0, 1000)
    })
  }

  function handleHistorySelect(entry: HistoryEntry) {
    openTab(entry.url)
    setShowNavigation(false)
  }

  function addDownload(filename: string, url: string, size: number = 0) {
    console.log('📁 Adding download to list:', filename, url, size)
    const downloadEntry: DownloadEntry = {
      id: crypto.randomUUID(),
      filename,
      url,
      size,
      downloadedAt: new Date(),
      status: 'completed'
    }
    
    setDownloads(prev => {
      const newDownloads = [downloadEntry, ...prev].slice(0, 500)
      console.log('📁 Downloads list updated, count:', newDownloads.length)
      return newDownloads
    })
  }

  // Ecouter les téléchargements démarrés côté main (session will-download)
  useEffect(() => {
    const off = (window as any).shy?.onDownloadStarted?.((payload: { filename: string; url: string; totalBytes: number }) => {
      addDownload(payload.filename, payload.url, payload.totalBytes || 0)
    })
    return () => {
      try { off?.() } catch {}
    }
  }, [])
  
  // Ecouter les événements BrowserView
  useEffect(() => {
    const electronAPI = (window as any).electronAPI
    if (!electronAPI) return
    
    const cleanupFns: (() => void)[] = []
    
    // Navigation events
    const offNavigation = electronAPI.onTabNavigation?.((data: { tabId: number; url: string; canGoBack: boolean; canGoForward: boolean }) => {
      const tab = tabs.find(t => t.browserViewId === data.tabId)
      if (tab) {
        setTabs(prev => prev.map(t => 
          t.id === tab.id 
            ? { ...t, url: data.url, favicon: getFaviconUrl(data.url) }
            : t
        ))
        addToHistory(data.url)
      }
    })
    if (offNavigation) cleanupFns.push(offNavigation)
    
    // Title updates
    const offTitle = electronAPI.onTabTitleUpdated?.((data: { tabId: number; title: string }) => {
      const tab = tabs.find(t => t.browserViewId === data.tabId)
      if (tab) {
        setTitleMap(prev => ({ ...prev, [tab.id]: data.title }))
        const currentTab = tabs.find(t => t.id === tab.id)
        if (currentTab?.url) {
          addToHistory(currentTab.url, data.title)
        }
      }
    })
    if (offTitle) cleanupFns.push(offTitle)
    
    // Favicon updates
    const offFavicon = electronAPI.onTabFaviconUpdated?.((data: { tabId: number; favicon: string }) => {
      const tab = tabs.find(t => t.browserViewId === data.tabId)
      if (tab) {
        setTabs(prev => prev.map(t => 
          t.id === tab.id 
            ? { ...t, favicon: data.favicon }
            : t
        ))
      }
    })
    if (offFavicon) cleanupFns.push(offFavicon)
    
    // Loading state
    const offLoading = electronAPI.onTabLoadingState?.((data: { tabId: number; isLoading: boolean }) => {
      const tab = tabs.find(t => t.browserViewId === data.tabId)
      if (tab) {
        setTabs(prev => prev.map(t => 
          t.id === tab.id 
            ? { ...t, isLoading: data.isLoading }
            : t
        ))
      }
    })
    if (offLoading) cleanupFns.push(offLoading)
    
    // Download events from BrowserView
    const offDownload = electronAPI.onTabDownloadStarted?.((data: { tabId: number; filename: string; url: string; totalBytes: number }) => {
      addDownload(data.filename, data.url, data.totalBytes)
    })
    if (offDownload) cleanupFns.push(offDownload)
    
    return () => {
      cleanupFns.forEach(cleanup => cleanup())
    }
  }, [tabs])

  // Fonction de test pour ajouter un téléchargement manuellement
  function addTestDownload() {
    const testFiles = [
      { filename: 'document.pdf', url: 'https://example.com/document.pdf', size: 2400000 },
      { filename: 'archive.zip', url: 'https://example.com/archive.zip', size: 15600000 },
      { filename: 'presentation.pptx', url: 'https://example.com/presentation.pptx', size: 8900000 }
    ]
    const randomFile = testFiles[Math.floor(Math.random() * testFiles.length)]
    addDownload(randomFile.filename, randomFile.url, randomFile.size)
  }

  // Menu handlers
  function handleOpenMenu(position: MenuPosition) {
    setMenuPosition(position)
    setMenuOpen(true)
  }

  function handleCloseMenu() {
    setMenuOpen(false)
  }

  function handleMenuAction(action: string) {
    switch (action) {
      case 'new-tab':
        setPaletteOpen(true)
        break
      case 'toggle-sidebar':
        setCollapsed(v => !v)
        break
      case 'toggle-theme':
        toggleTheme()
        break
      case 'show-archive':
        setShowNavigation(true)
        setNavigationCategory('history')
        break
      case 'reload':
        (async () => {
          if (activeId) {
            const electronAPI = (window as any).electronAPI
            const browserViewId = browserTabManager.current.getBrowserViewId(activeId)
            if (browserViewId && electronAPI?.tabAction) {
              await electronAPI.tabAction(browserViewId, 'reload')
            }
          }
        })()
        break
      case 'dev-tools':
        console.log('Use app menu to toggle DevTools')
        break
      case 'minimize':
        console.log('Minimize requested - use secure IPC if needed')
        break
      case 'maximize':
        console.log('Maximize requested - use secure IPC if needed')
        break
      case 'close':
        console.log('Close requested - use secure IPC if needed')
        break
    }
  }

  // Create menu items
  const menuItems = useMemo(() => createAppMenuItems({
    onNewTab: () => handleMenuAction('new-tab'),
    onToggleSidebar: () => handleMenuAction('toggle-sidebar'),
    onToggleTheme: () => handleMenuAction('toggle-theme'),
    onShowArchive: () => handleMenuAction('show-archive'),
    onReload: () => handleMenuAction('reload'),
    onToggleDevTools: () => handleMenuAction('dev-tools'),
    onMinimize: () => handleMenuAction('minimize'),
    onMaximize: () => handleMenuAction('maximize'),
    onClose: () => handleMenuAction('close'),
    isDark
  }), [isDark])


  async function handleDownloadSelect(entry: DownloadEntry) {
    // Ouvrir le dossier Downloads de l'utilisateur
    try {
      const electronSecure = (window as any).electronSecure
      if (electronSecure?.path && electronSecure?.shell) {
        const homedir = await electronSecure.path.homedir()
        const downloadsPath = await electronSecure.path.join(homedir, 'Downloads')
        await electronSecure.shell.showItemInFolder(downloadsPath)
      } else {
        console.warn('electronSecure API not available')
      }
    } catch (error) {
      console.error('Failed to open downloads folder:', error)
    }
    setShowNavigation(false)
  }

  // Mise à jour des favicons pour les onglets existants
  useEffect(() => {
    setTabs(prev => prev.map(tab => {
      if (!tab.favicon && tab.url) {
        const favicon = getFaviconUrl(tab.url)
        return { ...tab, favicon }
      }
      return tab
    }))
  }, [])

  // Raccourcis clavier locaux
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdT = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 't'
      const isCmdS = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's'
      
      if (isCmdT) { 
        e.preventDefault(); 
        setPaletteOpen(true) 
      }
      
      if (isCmdS) { 
        e.preventDefault(); 
        setCollapsed(v => !v) 
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Also handle accelerators fired from the main process (work when webview has focus)
  useEffect(() => {
    const offAccel = (window as any).shy?.onAccelerator?.((evt: { type: 'open-palette' | 'toggle-sidebar' }) => {
      if (evt.type === 'open-palette') setPaletteOpen(true)
      if (evt.type === 'toggle-sidebar') setCollapsed(v => !v)
    })
    const offGlobal = (window as any).shy?.onGlobalShortcut?.((shortcut: 'cmd+t' | 'cmd+s') => {
      if (shortcut === 'cmd+t') setPaletteOpen(true)
      if (shortcut === 'cmd+s') setCollapsed(v => !v)
    })
    return () => { try { offAccel?.() } catch {}; try { offGlobal?.() } catch {} }
  }, [])

  return (
    <div className="h-full w-full bg-white dark:bg-[#1F1F1F] text-neutral-900 dark:text-neutral-100">
      <TopBar
        collapsed={collapsed}
        currentUrl={activeTab?.url}
        onToggleSidebar={() => setCollapsed(v => !v)}
        onBack={async () => {
          if (activeId) {
            const electronAPI = (window as any).electronAPI
            const browserViewId = browserTabManager.current.getBrowserViewId(activeId)
            if (browserViewId && electronAPI?.tabAction) {
              await electronAPI.tabAction(browserViewId, 'back')
            }
          }
        }}
        onForward={async () => {
          if (activeId) {
            const electronAPI = (window as any).electronAPI
            const browserViewId = browserTabManager.current.getBrowserViewId(activeId)
            if (browserViewId && electronAPI?.tabAction) {
              await electronAPI.tabAction(browserViewId, 'forward')
            }
          }
        }}
        onReload={async () => {
          if (activeId) {
            const electronAPI = (window as any).electronAPI
            const browserViewId = browserTabManager.current.getBrowserViewId(activeId)
            if (browserViewId && electronAPI?.tabAction) {
              await electronAPI.tabAction(browserViewId, 'reload')
            }
          }
        }}
        onOpenPalette={() => setPaletteOpen(true)}
        onNavigate={(url) => navigateCurrent(url)}
        onOpenMenu={handleOpenMenu}
      />
      <div className="h-full pt-12 flex relative">
        {/* Zone de survol invisible pour réveiller la sidebar */}
        {collapsed && (
          <div
            className="absolute top-0 left-0 w-4 h-full z-50"
            onMouseEnter={() => setSidebarHovered(true)}
          />
        )}
        
        <div
          className={`relative transition-all duration-300 ease-out ${
            collapsed ? (sidebarHovered ? (showNavigation ? 'w-[600px]' : 'w-64') : 'w-0') : (showNavigation ? 'w-[600px]' : 'w-64')
          }`}
          onMouseLeave={() => setSidebarHovered(false)}
        >
          <Sidebar
            tabs={tabs.map(t => ({ ...t, title: titleMap[t.id] || t.title }))}
            activeId={activeId}
            collapsed={collapsed}
            sidebarHovered={sidebarHovered}
            isDark={isDark}
            showNavigation={showNavigation}
            navigationCategory={navigationCategory}
            history={history}
            downloads={downloads}
            onToggleCollapsed={() => setCollapsed(v => !v)}
            onSelect={async (id) => {
              setActiveId(id)
              // Set active in BrowserView
              await browserTabManager.current.setActiveTab(id)
              const tab = tabs.find(t => t.id === id)
              if (tab?.browserViewId) {
                setActiveBrowserViewId(tab.browserViewId)
              }
            }}
            onClose={closeTab}
            onNewTab={() => setPaletteOpen(true)}
            onToggleTheme={toggleTheme}
            onToggleNavigation={() => setShowNavigation(v => !v)}
            onNavigationCategoryChange={setNavigationCategory}
            onHistorySelect={handleHistorySelect}
            onDownloadSelect={handleDownloadSelect}
            onTestDownload={addTestDownload}
          />
        </div>
        <div className="flex-1 relative p-4">
          {activeTab ? (
            <div className="w-full h-full rounded-2xl overflow-hidden border border-neutral-200 dark:border-[#2A2A2A]">
              <BrowserView
                key={activeTab.id}
                ref={webviewRef}
                src={activeTab.url}
                browserViewId={activeTab.browserViewId}
                className="w-full h-full rounded-2xl"
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-400 dark:text-neutral-500 bg-neutral-50 dark:bg-neutral-800 rounded-2xl">
              Cmd+T pour rechercher…
            </div>
          )}

          <CommandPalette
            open={paletteOpen}
            onClose={() => setPaletteOpen(false)}
            tabs={tabs.map(t => ({ ...t, title: titleMap[t.id] || t.title }))}
            onSelectTab={async (id) => { 
              setActiveId(id)
              // Set active in BrowserView
              await browserTabManager.current.setActiveTab(id)
              const tab = tabs.find(t => t.id === id)
              if (tab?.browserViewId) {
                setActiveBrowserViewId(tab.browserViewId)
              }
            }}
            onSearch={(q) => {
              // Toujours ouvrir dans un nouvel onglet lorsqu'on recherche via la palette
              openTab(q)
            }}
          />
        </div>
        
        {/* Context Menu */}
        <ContextMenu
          isOpen={menuOpen}
          position={menuPosition}
          items={menuItems}
          onClose={handleCloseMenu}
          isDark={isDark}
        />
      </div>
    </div>
  )
}

