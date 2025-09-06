import { useEffect, useMemo, useRef, useState } from 'react'
import type { WebviewTag } from 'electron'
import BrowserView from '../components/BrowserView'
import Sidebar, { type Tab } from '../components/Sidebar'
import CommandPalette from '../components/CommandPalette'
import { normalizeUrl } from '../lib/url'
import { getFaviconUrl } from '../lib/favicon'
import TopBar from '../components/TopBar'

export default function BrowserPage() {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeId, setActiveId] = useState<string | undefined>(undefined)
  const [collapsed, setCollapsed] = useState(false)
  const [titleMap, setTitleMap] = useState<Record<string, string>>({})
  const [paletteOpen, setPaletteOpen] = useState(false)
  const webviewRef = useRef<WebviewTag | null>(null)

  const activeTab = useMemo(() => tabs.find(t => t.id === activeId), [tabs, activeId])

  function openTab(url?: string) {
    const u = normalizeUrl(url || '')
    const id = crypto.randomUUID()
    const t: Tab = { id, url: u, title: 'New Tab', favicon: getFaviconUrl(u) }
    setTabs(prev => [t, ...prev])
    setActiveId(id)
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
  }

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
    <div className="h-full w-full bg-white text-neutral-900">
      <TopBar
        collapsed={collapsed}
        onToggleSidebar={() => setCollapsed(v => !v)}
        onBack={() => (webviewRef.current as any)?.goBack?.()}
        onForward={() => (webviewRef.current as any)?.goForward?.()}
        onReload={() => (webviewRef.current as any)?.reload?.()}
        onOpenPalette={() => setPaletteOpen(true)}
      />
      <div className="h-full pt-12 flex">
        <Sidebar
          tabs={tabs.map(t => ({ ...t, title: titleMap[t.id] || t.title }))}
          activeId={activeId}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed(v => !v)}
          onSelect={setActiveId}
          onClose={closeTab}
          onNewTab={() => setPaletteOpen(true)}
        />
        <div className="flex-1 relative">
          {activeTab ? (
            <BrowserView
              key={activeTab.id}
              ref={webviewRef as any}
              src={activeTab.url}
              className="absolute inset-0"
              onUrlChange={(u) => setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, url: u } : t))}
              onTitleChange={(t) => setTitleMap(prev => ({ ...prev, [activeId!]: t || 'Shy Navigator' }))}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-neutral-400">Cmd+T pour rechercher…</div>
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
