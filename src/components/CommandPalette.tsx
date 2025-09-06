import { useEffect, useMemo, useRef, useState } from 'react'
import type { Tab } from './Sidebar'

type Props = {
  open: boolean
  onClose: () => void
  tabs: Tab[]
  onSelectTab: (id: string) => void
  onSearch: (query: string) => void
}

type GoogleSuggestion = {
  text: string
  type: 'suggestion'
}

export default function CommandPalette({ open, onClose, tabs, onSelectTab, onSearch }: Props) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const [suggestions, setSuggestions] = useState<GoogleSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setIndex(0)
      setSuggestions([])
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  // Fetch Google suggestions
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([])
      setLoading(false)
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    const fetchSuggestions = async () => {
      setLoading(true)
      try {
        // Using Google's suggest API (JSONP)
        const script = document.createElement('script')
        const callbackName = `googleSuggestions${Date.now()}`
        
        // Define callback
        ;(window as any)[callbackName] = (data: any) => {
          if (!controller.signal.aborted && data && data[1]) {
            const googleSuggestions: GoogleSuggestion[] = data[1]
              .slice(0, 6) // Limit to 6 suggestions
              .map((suggestion: string) => ({
                text: suggestion,
                type: 'suggestion' as const
              }))
            setSuggestions(googleSuggestions)
          }
          setLoading(false)
          document.body.removeChild(script)
          delete (window as any)[callbackName]
        }

        script.src = `https://suggestqueries.google.com/complete/search?client=chrome&callback=${callbackName}&q=${encodeURIComponent(query)}`
        document.body.appendChild(script)

        // Cleanup timeout
        setTimeout(() => {
          if (document.body.contains(script)) {
            document.body.removeChild(script)
            delete (window as any)[callbackName]
            setLoading(false)
          }
        }, 5000)

      } catch (error) {
        if (!controller.signal.aborted) {
          setLoading(false)
          setSuggestions([])
        }
      }
    }

    const timeoutId = setTimeout(fetchSuggestions, 200) // Debounce

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [query])

  const filtered = useMemo(() => {
    if (!query) return tabs
    const q = query.toLowerCase()
    return tabs.filter(t => (t.title || t.url).toLowerCase().includes(q))
  }, [query, tabs])

  const allItems = useMemo(() => {
    const items: Array<Tab | GoogleSuggestion> = [...filtered]
    if (query.trim() && suggestions.length > 0) {
      items.push(...suggestions)
    }
    return items
  }, [filtered, suggestions, query])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(i + 1, allItems.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        const selectedItem = allItems[index]
        if (selectedItem) {
          if ('type' in selectedItem && selectedItem.type === 'suggestion') {
            onSearch(selectedItem.text)
          } else if ('id' in selectedItem) {
            onSelectTab(selectedItem.id)
          }
        } else if (query.trim()) {
          onSearch(query)
        }
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, query, index, onSearch, onSelectTab, onClose, allItems])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[640px] max-w-[90vw] bg-white text-neutral-900 border border-[#ECECEC] rounded-[20px] shadow-[0_2px_0_#ECECEC,0_16px_40px_rgba(0,0,0,0.08)]" onMouseDown={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-[#ECECEC]">
          <input
            ref={inputRef}
            className="w-full bg-neutral-50 border border-[#ECECEC] rounded-full px-5 py-3 outline-none focus:ring-2 focus:ring-indigo-500 text-[18px]"
            placeholder="Rechercher ou entrer une URL…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-3">
          {allItems.map((item, i) => {
            if ('type' in item && item.type === 'suggestion') {
              return (
                <div
                  key={`suggestion-${i}`}
                  className={`px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between ${i === index ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-50'}`}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => { onSearch(item.text); onClose() }}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-neutral-400">🔍</div>
                    <div className="truncate text-[15px]">{item.text}</div>
                  </div>
                  <div className="opacity-70 text-sm ml-4">Rechercher →</div>
                </div>
              )
            } else {
              const tab = item as Tab
              return (
                <div
                  key={tab.id}
                  className={`px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between ${i === index ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-50'}`}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => { onSelectTab(tab.id); onClose() }}
                >
                  <div className="truncate text-[15px] font-medium">{tab.title || tab.url}</div>
                  <div className="opacity-70 text-sm ml-4">Aller à l'onglet →</div>
                </div>
              )
            }
          })}
          {allItems.length === 0 && query.trim() && (
            <div className="text-neutral-500 text-sm px-3 py-4">
              {loading ? 'Chargement des suggestions...' : 'Aucun résultat. Appuie sur Entrée pour rechercher avec Google.'}
            </div>
          )}
          {allItems.length === 0 && !query.trim() && (
            <div className="text-neutral-500 text-sm px-3 py-4">Commence à taper pour voir les suggestions...</div>
          )}
        </div>
      </div>
    </div>
  )
}
