import { Menu, ChevronLeft, ChevronRight, RotateCcw, Search, Ellipsis } from 'lucide-react'
import { extractDomain } from '../lib/url'
import { useState, useRef } from 'react'

type Props = {
  collapsed: boolean
  currentUrl?: string
  onToggleSidebar: () => void
  onBack: () => void
  onForward: () => void
  onReload: () => void
  onOpenPalette: () => void
  onNavigate?: (url: string) => void
}

export default function TopBar({ collapsed, currentUrl, onToggleSidebar, onBack, onForward, onReload, onOpenPalette, onNavigate }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="fixed top-0 left-0 right-0 h-12 z-40 py-2">
      <div className="h-full drag-region">
        {/* Layout en 3 zones (gauche / centre / droite). La zone centrale est absolument centrée. */}
        <div className="h-full px-3 relative">
        {/* Espace pour les pastilles macOS */}
        <div className="absolute inset-y-0 left-0 flex items-center gap-3 pl-24 no-drag text-neutral-700 dark:text-neutral-300">
          {/* Bouton sidebar */}
          <button
            className="size-8 inline-flex items-center justify-center rounded-full text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            title={collapsed ? 'Afficher la sidebar' : 'Cacher la sidebar'}
            onClick={onToggleSidebar}
          >
            <Menu className="w-5 h-5" />
          </button>
          {/* Groupe navigation */}
          <div className="flex items-center rounded-full">
            <button className="size-8 inline-flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-full" title="Précédent" onClick={onBack}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button className="size-8 inline-flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-full" title="Suivant" onClick={onForward}>
              <ChevronRight className="w-5 h-5" />
            </button>
            <button className="size-8 inline-flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-full" title="Recharger" onClick={onReload}>
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barre d'adresse éditable - centrée */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center no-drag">
          {isEditing ? (
            <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-neutral-50 dark:bg-neutral-800 min-w-80">
              <Search className="w-4 h-4 text-neutral-500" />
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (onNavigate && inputValue.trim()) {
                      onNavigate(inputValue.trim())
                    }
                    setIsEditing(false)
                  }
                  if (e.key === 'Escape') {
                    setIsEditing(false)
                    setInputValue('')
                  }
                }}
                onBlur={() => {
                  setIsEditing(false)
                  setInputValue('')
                }}
                className="flex-1 bg-transparent outline-none text-[15px] text-neutral-900 dark:text-neutral-100 placeholder-neutral-500"
                placeholder="Rechercher ou entrer une URL…"
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={() => {
                setIsEditing(true)
                setInputValue(currentUrl || '')
                setTimeout(() => inputRef.current?.select(), 10)
              }}
              className="flex items-center gap-3 px-6 py-2 rounded-full bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <Search className="w-4 h-4" />
              <span className="text-[15px] opacity-90">
                {currentUrl ? extractDomain(currentUrl) : "Rechercher ou entrer une URL…"}
              </span>
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenPalette()
                }}
                className="ml-2 text-[11px] px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600"
              >
                ⌘T
              </button>
            </button>
          )}
        </div>

        {/* Espace réservé à droite pour actions futures */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 no-drag">
          <div className="size-8 inline-flex items-center justify-center rounded-full text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
            <Ellipsis className="w-5 h-5" />
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
