import { useEffect, useMemo, useRef, useState } from 'react'
import type { WebviewTag } from 'electron'
import BrowserView from '../components/BrowserView'
import Sidebar, { type Tab } from '../components/Sidebar'
import CommandPalette from '../components/CommandPalette'
import { normalizeUrl } from '../lib/url'
import { getFaviconUrl } from '../lib/favicon'
import TopBar from '../components/TopBar'
import { useTheme } from '../hooks/useTheme'
import { Moon, Sun } from 'lucide-react'
import type { HistoryEntry } from '../components/ArchiveView'

export default function BrowserPage() {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeId, setActiveId] = useState<string | undefined>(undefined)
  const [collapsed, setCollapsed] = useState(false)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [titleMap, setTitleMap] = useState<Record<string, string>>({})
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const webviewRef = useRef<WebviewTag | null>(null)
  const { isDark, toggleTheme } = useTheme()

  const activeTab = useMemo(() => tabs.find(t => t.id === activeId), [tabs, activeId])

  function openTab(url?: string) {
    const u = normalizeUrl(url || '')
    const id = crypto.randomUUID()
    const favicon = getFaviconUrl(u)
    console.log('📂 openTab - URL:', u, 'Favicon:', favicon)
    const t: Tab = { id, url: u, title: 'New Tab', favicon }
    setTabs(prev => [t, ...prev])
    setActiveId(id)
    
    // Ajouter à l'historique
    if (url && url.trim()) {
      addToHistory(u)
    }
  }

  function closeTab(id: string) {
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
    setShowArchive(false)
  }

  // Mise à jour des favicons pour les onglets existants
  useEffect(() => {
    console.log('🔄 Updating existing tabs with favicons')
    setTabs(prev => prev.map(tab => {
      if (!tab.favicon && tab.url) {
        const favicon = getFaviconUrl(tab.url)
        console.log('🔄 Updating tab:', tab.url, 'with favicon:', favicon)
        return { ...tab, favicon }
      }
      return tab
    }))
  }, [])

  // Ne force plus l'ouverture si 0 onglets; l'utilisateur peut fermer la palette

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

  return (
    <div className="h-full w-full bg-white dark:bg-[#1F1F1F] text-neutral-900 dark:text-neutral-100">
      <TopBar
        collapsed={collapsed}
        currentUrl={activeTab?.url}
        onToggleSidebar={() => setCollapsed(v => !v)}
        onBack={() => (webviewRef.current as any)?.goBack?.()}
        onForward={() => (webviewRef.current as any)?.goForward?.()}
        onReload={() => (webviewRef.current as any)?.reload?.()}
        onOpenPalette={() => setPaletteOpen(true)}
        onNavigate={(url) => navigateCurrent(url)}
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
            collapsed ? (sidebarHovered ? 'w-64' : 'w-0') : 'w-64'
          }`}
          onMouseLeave={() => setSidebarHovered(false)}
        >
          <Sidebar
            tabs={tabs.map(t => ({ ...t, title: titleMap[t.id] || t.title }))}
            activeId={activeId}
            collapsed={collapsed}
            sidebarHovered={sidebarHovered}
            isDark={isDark}
            showArchive={showArchive}
            history={history}
            onToggleCollapsed={() => setCollapsed(v => !v)}
            onSelect={setActiveId}
            onClose={closeTab}
            onNewTab={() => setPaletteOpen(true)}
            onToggleTheme={toggleTheme}
            onToggleArchive={() => setShowArchive(v => !v)}
            onHistorySelect={handleHistorySelect}
          />
        </div>
        <div className="flex-1 relative p-4">
          {activeTab ? (
            <div className="w-full h-full rounded-2xl overflow-hidden border border-neutral-200 dark:border-[#2A2A2A]">
              <BrowserView
                key={activeTab.id}
                ref={webviewRef as any}
                src={activeTab.url}
                className="w-full h-full rounded-2xl"
                onUrlChange={(u) => {
                  setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, url: u, favicon: getFaviconUrl(u) } : t))
                  addToHistory(u)
                }}
                onTitleChange={(t) => {
                  setTitleMap(prev => ({ ...prev, [activeId!]: t || 'Shy Navigator' }))
                  // Mettre à jour l'historique avec le titre
                  if (t && activeTab.url) {
                    addToHistory(activeTab.url, t)
                  }
                }}
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
            onSelectTab={(id) => { setActiveId(id) }}
            onSearch={(q) => {
              // Toujours ouvrir dans un nouvel onglet lorsqu'on recherche via la palette
              openTab(q)
            }}
          />
        </div>
      </div>
    </div>
  )
}
