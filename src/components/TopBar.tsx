type Props = {
  collapsed: boolean
  onToggleSidebar: () => void
  onBack: () => void
  onForward: () => void
  onReload: () => void
  onOpenPalette: () => void
}

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function TopBar({ collapsed, onToggleSidebar, onBack, onForward, onReload, onOpenPalette }: Props) {
  return (
    <div className="fixed top-0 left-0 right-0 h-10 z-40 drag-region" style={{
      background: 'linear-gradient(180deg, rgba(10,10,14,0.85) 0%, rgba(10,10,14,0.65) 100%)'
    }}>
      <div className="h-full flex items-center gap-3 px-3 border-b border-neutral-800/80">
        {/* Espace pour les pastilles macOS */}
        <div className="pl-16" />

        {/* Contrôles navigation & sidebar */}
        <div className="no-drag flex items-center gap-2 text-neutral-300">
          <button
            className="p-1.5 rounded hover:bg-neutral-800/80 hover:text-white"
            title={collapsed ? 'Afficher la sidebar' : 'Cacher la sidebar'}
            onClick={onToggleSidebar}
          >
            <Icon className="w-5 h-5" d="M3.75 5.25h16.5M3.75 12h7.5m-7.5 6.75h16.5" />
          </button>
          <button className="p-1.5 rounded hover:bg-neutral-800/80 hover:text-white" title="Précédent" onClick={onBack}>
            <Icon className="w-5 h-5" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </button>
          <button className="p-1.5 rounded hover:bg-neutral-800/80 hover:text-white" title="Suivant" onClick={onForward}>
            <Icon className="w-5 h-5" d="M8.25 4.5L15.75 12l-7.5 7.5" />
          </button>
          <button className="p-1.5 rounded hover:bg-neutral-800/80 hover:text-white" title="Recharger" onClick={onReload}>
            <Icon className="w-5 h-5" d="M4.5 12a7.5 7.5 0 0112.92-5.303M19.5 12a7.5 7.5 0 01-12.92 5.303M9 4.5h3.75V1.5" />
          </button>
        </div>

        {/* Barre de recherche (ouvre la palette) */}
        <div className="no-drag flex-1 flex justify-center">
          <button
            onClick={onOpenPalette}
            className="w-full max-w-xl flex items-center gap-3 px-4 py-2 rounded-full bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-300 border border-neutral-700/60 shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
            <span className="text-sm opacity-90">Search or Enter URL…</span>
            <span className="ml-auto text-[11px] px-2 py-0.5 rounded bg-neutral-700/60 text-neutral-200 border border-neutral-600/60">⌘T</span>
          </button>
        </div>

        {/* réserve droite (future actions) */}
        <div className="w-12" />
      </div>
    </div>
  )
}
