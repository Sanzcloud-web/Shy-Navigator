import { Menu, ChevronLeft, ChevronRight, RotateCcw, Search, Ellipsis } from 'lucide-react'

type Props = {
  collapsed: boolean
  onToggleSidebar: () => void
  onBack: () => void
  onForward: () => void
  onReload: () => void
  onOpenPalette: () => void
}

export default function TopBar({ collapsed, onToggleSidebar, onBack, onForward, onReload, onOpenPalette }: Props) {
  return (
    <div className="fixed top-0 left-0 right-0 h-12 z-40 drag-region">
      {/* Layout en 3 zones (gauche / centre / droite). La zone centrale est absolument centrée. */}
      <div className="h-full px-4 relative">
        {/* Espace pour les pastilles macOS */}
        <div className="absolute inset-y-0 left-0 flex items-center gap-3 pl-24 no-drag text-neutral-700">
          {/* Bouton sidebar */}
          <button
            className="size-8 inline-flex items-center justify-center rounded-full text-neutral-600 hover:text-neutral-900"
            title={collapsed ? 'Afficher la sidebar' : 'Cacher la sidebar'}
            onClick={onToggleSidebar}
          >
            <Menu className="w-5 h-5" />
          </button>
          {/* Groupe navigation */}
          <div className="flex items-center rounded-full">
            <button className="size-8 inline-flex items-center justify-center text-neutral-600 hover:text-neutral-900 rounded-full" title="Précédent" onClick={onBack}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button className="size-8 inline-flex items-center justify-center text-neutral-600 hover:text-neutral-900 rounded-full" title="Suivant" onClick={onForward}>
              <ChevronRight className="w-5 h-5" />
            </button>
            <button className="size-8 inline-flex items-center justify-center text-neutral-600 hover:text-neutral-900 rounded-full" title="Recharger" onClick={onReload}>
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barre de recherche (ouvre la palette) - centrée */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center no-drag w-full max-w-2xl">
          <button
            onClick={onOpenPalette}
            className="w-full flex items-center gap-3 px-6 py-2.5 rounded-full bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
          >
            <Search className="w-4 h-4" />
            <span className="text-[15px] opacity-90">Rechercher ou entrer une URL…</span>
            <span className="ml-auto text-[11px] px-2 py-0.5 rounded bg-neutral-200 text-neutral-700">⌘T</span>
          </button>
        </div>

        {/* Espace réservé à droite pour actions futures */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 no-drag">
          <div className="size-8 inline-flex items-center justify-center rounded-full text-neutral-500 hover:text-neutral-700">
            <Ellipsis className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  )
}
