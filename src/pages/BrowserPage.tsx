import { useEffect, useMemo, useRef, useState } from 'react'
import type { WebviewTag } from 'electron'
import BrowserView from '../components/BrowserView'
import Sidebar, { type Tab } from '../components/Sidebar'
import CommandPalette from '../components/CommandPalette'
import ContextMenu, { createAppMenuItems, type MenuPosition } from '../components/ContextMenu'
import { TabbedBrowserWindow } from '../browser'
import { normalizeUrl } from '../lib/url'
import { getFaviconUrl } from '../lib/favicon'
import TopBar from '../components/TopBar'
import { useTheme } from '../hooks/useTheme'
import { Moon, Sun } from 'lucide-react'
import type { HistoryEntry } from '../components/ArchiveView'
import type { DownloadEntry, NavigationCategory } from '../components/NavigationView'

// Renderer-managed webview tabs
interface EnhancedTab extends Tab {
  tabInstance?: import('../browser').Tab
  isLoading?: boolean
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
  const webviewRef = useRef<WebviewTag | null>(null)
  const { isDark, toggleTheme } = useTheme()

  const browserWindow = useRef(new TabbedBrowserWindow({}))

  const activeTab = useMemo(() => tabs.find(t => t.id === activeId), [tabs, activeId])

  function openTab(url?: string) {
    const u = normalizeUrl(url || '')
    const id = crypto.randomUUID()
    const favicon = getFaviconUrl(u)
    const tabInstance = browserWindow.current.createTab(u, id)
    const t: EnhancedTab = { id, url: u, title: 'New Tab', favicon, tabInstance, isLoading: false }
    setTabs(prev => [t, ...prev])
    setActiveId(id)
    if (url && url.trim()) addToHistory(u)
  }

  function closeTab(id: string) {
    const tab = tabs.find(t => t.id === id)
    if (tab?.tabInstance) browserWindow.current.closeTab(tab.tabInstance.id)
    setTabs(prev => prev.filter(t => t.id !== id))
    if (activeId === id) {
      const rest = tabs.filter(t => t.id !== id)
      setActiveId(rest[0]?.id)
      if (rest.length === 0) setPaletteOpen(true)
    }
  }

  function navigateCurrent(url: string) {
    if (!activeId) { openTab(url); return }
    const u = normalizeUrl(url)
    const tab = tabs.find(t => t.id === activeId)
    tab?.tabInstance?.loadURL(u)
    setTabs(prev => prev.map(t => t.id === activeId ? { ...t, url: u, favicon: getFaviconUrl(u) } : t))
    addToHistory(u)
  }

  function addToHistory(url: string, title?: string) {
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      title: title || new URL(url).hostname,
      url,
      favicon: getFaviconUrl(url),
      visitedAt: new Date()
    }
    setHistory(prev => {
      const recent = prev.find(e => e.url === url && Date.now() - e.visitedAt.getTime() < 5 * 60 * 1000)
      if (recent) return prev
      return [entry, ...prev].slice(0, 1000)
    })
  }

  function handleHistorySelect(entry: HistoryEntry) {
    openTab(entry.url)
    setShowNavigation(false)
  }

  function addDownload(filename: string, url: string, size: number = 0) {
    const entry: DownloadEntry = { id: crypto.randomUUID(), filename, url, size, downloadedAt: new Date(), status: 'completed' }
    setDownloads(prev => [entry, ...prev].slice(0, 500))
  }

  // Downloads from main
  useEffect(() => {
    const off = (window as any).shy?.onDownloadStarted?.((payload: { filename: string; url: string; totalBytes: number }) => {
      addDownload(payload.filename, payload.url, payload.totalBytes || 0)
    })
    return () => { try { off?.() } catch {} }
  }, [])

  // Local shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdT = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 't'
      const isCmdS = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's'
      if (isCmdT) { e.preventDefault(); setPaletteOpen(true) }
      if (isCmdS) { e.preventDefault(); setCollapsed(v => !v) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Accelerators from main (when webview focused)
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

  function handleOpenMenu(position: MenuPosition) { setMenuPosition(position); setMenuOpen(true) }
  function handleCloseMenu() { setMenuOpen(false) }

  function handleMenuAction(action: string) {
    switch (action) {
      case 'new-tab': setPaletteOpen(true); break
      case 'toggle-sidebar': setCollapsed(v => !v); break
      case 'toggle-theme': toggleTheme(); break
      case 'show-archive': setShowNavigation(true); setNavigationCategory('history'); break
      case 'reload': webviewRef.current?.reload?.(); break
      case 'dev-tools':
        try { (webviewRef.current as any)?.getWebContents?.().toggleDevTools() } catch {}
        break
    }
  }

  const menuItems = useMemo(() => createAppMenuItems({
    onNewTab: () => handleMenuAction('new-tab'),
    onToggleSidebar: () => handleMenuAction('toggle-sidebar'),
    onToggleTheme: () => handleMenuAction('toggle-theme'),
    onShowArchive: () => handleMenuAction('show-archive'),
    onReload: () => handleMenuAction('reload'),
    onToggleDevTools: () => handleMenuAction('dev-tools'),
    onMinimize: () => {},
    onMaximize: () => {},
    onClose: () => {},
    isDark
  }), [isDark])

  async function handleDownloadSelect(entry: DownloadEntry) {
    try {
      const electronSecure = (window as any).electronSecure
      if (electronSecure?.path && electronSecure?.shell) {
        const homedir = await electronSecure.path.homedir()
        const downloadsPath = await electronSecure.path.join(homedir, 'Downloads')
        await electronSecure.shell.showItemInFolder(downloadsPath)
      }
    } catch {}
    setShowNavigation(false)
  }

  // Set initial favicon for existing tabs if needed
  useEffect(() => {
    setTabs(prev => prev.map(tab => tab.favicon ? tab : (tab.url ? { ...tab, favicon: getFaviconUrl(tab.url) } : tab)))
  }, [])

  return (
    <div className="h-full w-full bg-white dark:bg-[#1F1F1F] text-neutral-900 dark:text-neutral-100">
      <TopBar
        collapsed={collapsed}
        currentUrl={activeTab?.url}
        onToggleSidebar={() => setCollapsed(v => !v)}
        onBack={() => { const t = tabs.find(x => x.id === activeId)?.tabInstance; t?.goBack() }}
        onForward={() => { const t = tabs.find(x => x.id === activeId)?.tabInstance; t?.goForward() }}
        onReload={() => { const t = tabs.find(x => x.id === activeId)?.tabInstance; t?.reload() }}
        onOpenPalette={() => setPaletteOpen(true)}
        onNavigate={(url) => navigateCurrent(url)}
        onOpenMenu={handleOpenMenu}
      />
      <div className="h-full pt-12 flex relative">
        {collapsed && (
          <div className="absolute top-0 left-0 w-4 h-full z-50" onMouseEnter={() => setSidebarHovered(true)} />
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
            onSelect={(id) => {
              setActiveId(id)
              const tab = tabs.find(t => t.id === id)
              if (tab?.tabInstance) browserWindow.current.setActiveTab(tab.tabInstance)
            }}
            onClose={closeTab}
            onNewTab={() => setPaletteOpen(true)}
            onToggleTheme={toggleTheme}
            onToggleNavigation={() => setShowNavigation(v => !v)}
            onNavigationCategoryChange={setNavigationCategory}
            onHistorySelect={handleHistorySelect}
            onDownloadSelect={handleDownloadSelect}
            onTestDownload={() => {
              addDownload('document.pdf', 'https://example.com/document.pdf', 2400000)
            }}
          />
        </div>
        <div className="flex-1 relative p-4">
          {activeTab ? (
            <div className="w-full h-full rounded-2xl overflow-hidden border border-neutral-200 dark:border-[#2A2A2A]">
              <BrowserView
                key={activeTab.id}
                ref={webviewRef}
                src={activeTab.url}
                tabInstance={activeTab.tabInstance}
                className="w-full h-full rounded-2xl"
                onUrlChange={(u) => {
                  setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, url: u, favicon: getFaviconUrl(u) } : t))
                  addToHistory(u)
                }}
                onTitleChange={(t) => {
                  setTitleMap(prev => ({ ...prev, [activeId!]: t || 'Shy Navigator' }))
                  if (t && activeTab.url) addToHistory(activeTab.url, t)
                }}
                onDownload={(filename, url, size) => addDownload(filename, url, size)}
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
            onSelectTab={(id) => {
              setActiveId(id)
              const tab = tabs.find(t => t.id === id)
              if (tab?.tabInstance) browserWindow.current.setActiveTab(tab.tabInstance)
            }}
            onSearch={(q) => openTab(q)}
          />
        </div>

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

