import { useEffect, useMemo, useRef, useState } from 'react'
import type { Tab } from './Sidebar'

type Props = {
  open: boolean
  onClose: () => void
  tabs: Tab[]
  onSelectTab: (id: string) => void
  onSearch: (query: string) => void
}

export default function CommandPalette({ open, onClose, tabs, onSelectTab, onSearch }: Props) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(i + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (query.trim()) onSearch(query)
        else if (filtered[index]) onSelectTab(filtered[index].id)
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, query, index, onSearch, onSelectTab, onClose])

  const filtered = useMemo(() => {
    if (!query) return tabs
    const q = query.toLowerCase()
    return tabs.filter(t => (t.title || t.url).toLowerCase().includes(q))
  }, [query, tabs])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-[2px] flex items-center justify-center z-50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[760px] max-w-[92vw] bg-white text-neutral-900 border border-[#ECECEC] rounded-[20px] shadow-[0_2px_0_#ECECEC,0_16px_40px_rgba(0,0,0,0.08)]" onMouseDown={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-[#ECECEC]">
          <input
            ref={inputRef}
            className="w-full bg-neutral-50 border border-[#ECECEC] rounded-full px-5 py-3 outline-none focus:ring-2 focus:ring-indigo-500 text-[18px] font-display"
            placeholder="Rechercher ou entrer une URL…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-3">
          {filtered.map((t, i) => (
            <div
              key={t.id}
              className={`px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between ${i === index ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-50'}`}
              onMouseEnter={() => setIndex(i)}
              onClick={() => { onSelectTab(t.id); onClose() }}
            >
              <div className="truncate font-display text-[17px]">{t.title || t.url}</div>
              <div className="opacity-70 text-sm ml-4">Aller à l’onglet →</div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-neutral-500 text-sm px-3 py-4">Aucun résultat. Appuie sur Entrée pour rechercher avec Google.</div>
          )}
        </div>
      </div>
    </div>
  )
}
