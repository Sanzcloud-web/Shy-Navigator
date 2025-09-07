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
import type { DownloadEntry, NavigationCategory } from '../components/NavigationView'

export default function BrowserPage() {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeId, setActiveId] = useState<string | undefined>(undefined)
  const [collapsed, setCollapsed] = useState(false)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [titleMap, setTitleMap] = useState<Record<string, string>>({})
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [showNavigation, setShowNavigation] = useState(false)
  const [navigationCategory, setNavigationCategory] = useState<NavigationCategory>('history')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [downloads, setDownloads] = useState<DownloadEntry[]>([])
  const [tabIdMap, setTabIdMap] = useState<Record<string, number>>({})
  const webviewRef = useRef<any>(null)
  const { isDark, toggleTheme } = useTheme()

  const activeTab = useMemo(() => tabs.find(t => t.id === activeId), [tabs, activeId])

  async function openTab(url?: string) {
    const u = normalizeUrl(url || '')
    const id = crypto.randomUUID()
    const favicon = getFaviconUrl(u)
    console.log('📂 openTab - URL:', u, 'Favicon:', favicon)
    
    try {
      // Create BrowserView tab via Electron API
      const electronAPI = (window as any).electronAPI
      if (electronAPI?.createTab) {
        const browserViewTab = await electronAPI.createTab(u)
        if (browserViewTab) {
          // Map our React tab ID to BrowserView tab ID
          setTabIdMap(prev => ({ ...prev, [id]: browserViewTab.id }))
          
          // Create React tab state
          const t: Tab = { id, url: u, title: 'New Tab', favicon }
          setTabs(prev => [t, ...prev])
          setActiveId(id)
          
          // Set as active in BrowserView
          await electronAPI.setActiveTab(browserViewTab.id)
          
          // Ajouter à l'historique
          if (url && url.trim()) {
            addToHistory(u)
          }
          return
        }
      }
    } catch (error) {
      console.error('Failed to create BrowserView tab:', error)
    }
    
    // Fallback: create React tab without BrowserView (shouldn't happen in normal flow)
    const t: Tab = { id, url: u, title: 'New Tab', favicon }
    setTabs(prev => [t, ...prev])
    setActiveId(id)
  }

  async function closeTab(id: string) {
    try {
      // Close BrowserView tab
      const browserViewTabId = tabIdMap[id]
      if (browserViewTabId !== undefined) {
        const electronAPI = (window as any).electronAPI
        if (electronAPI?.closeTab) {
          await electronAPI.closeTab(browserViewTabId)
        }
        // Remove from mapping
        setTabIdMap(prev => {
          const newMap = { ...prev }
          delete newMap[id]
          return newMap
        })
      }
    } catch (error) {
      console.error('Failed to close BrowserView tab:', error)
    }
    
    // Update React state
    setTabs(prev => prev.filter(t => t.id !== id))
    if (activeId === id) {
      const rest = tabs.filter(t => t.id !== id)
      setActiveId(rest[0]?.id)
      if (rest.length === 0) setPaletteOpen(true)
    }
  }

  async function navigateCurrent(url: string) {
    if (!activeId) { openTab(url); return }
    const u = normalizeUrl(url)
    
    try {
      // Navigate BrowserView tab
      const browserViewTabId = tabIdMap[activeId]
      if (browserViewTabId !== undefined) {
        const electronAPI = (window as any).electronAPI
        if (electronAPI?.navigateTab) {
          await electronAPI.navigateTab(browserViewTabId, u)
        }
      }
    } catch (error) {
      console.error('Failed to navigate BrowserView tab:', error)
    }
    
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


  async function handleDownloadSelect(entry: DownloadEntry) {
    // Ouvrir le dossier Downloads de l'utilisateur (dossier par défaut de Chromium) - Version sécurisée
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
        onBack={() => webviewRef.current?.goBack?.()}
        onForward={() => webviewRef.current?.goForward?.()}
        onReload={() => webviewRef.current?.reload?.()}
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
              // Set active tab in BrowserView
              const browserViewTabId = tabIdMap[id]
              if (browserViewTabId !== undefined) {
                const electronAPI = (window as any).electronAPI
                if (electronAPI?.setActiveTab) {
                  await electronAPI.setActiveTab(browserViewTabId)
                }
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
                tabId={tabIdMap[activeTab.id]} // Pass the BrowserView tab ID
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
                onDownload={(filename, url, size) => {
                  console.log('📥 Real download detected:', filename, url, size)
                  addDownload(filename, url, size)
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
            onSelectTab={async (id) => { 
              setActiveId(id)
              // Set active tab in BrowserView
              const browserViewTabId = tabIdMap[id]
              if (browserViewTabId !== undefined) {
                const electronAPI = (window as any).electronAPI
                if (electronAPI?.setActiveTab) {
                  await electronAPI.setActiveTab(browserViewTabId)
                }
              }
            }}
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
