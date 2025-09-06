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
    <div className="fixed top-0 left-0 right-0 h-10 z-40 bg-white/95 border-b border-[#ECECEC] backdrop-blur-sm drag-region">
      <div className="h-full flex items-center gap-3 px-3">
        {/* Espace pour les pastilles macOS */}
        <div className="pl-16" />

        {/* Contrôles navigation & sidebar */}
        <div className="no-drag flex items-center gap-2 text-neutral-700">
          <button
            className="p-1.5 rounded hover:bg-neutral-100 hover:text-black border border-transparent hover:border-[#ECECEC]"
            title={collapsed ? 'Afficher la sidebar' : 'Cacher la sidebar'}
            onClick={onToggleSidebar}
          >
            <Icon className="w-5 h-5" d="M3.75 5.25h16.5M3.75 12h7.5m-7.5 6.75h16.5" />
          </button>
          <button className="p-1.5 rounded hover:bg-neutral-100 hover:text-black border border-transparent hover:border-[#ECECEC]" title="Précédent" onClick={onBack}>
            <Icon className="w-5 h-5" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </button>
          <button className="p-1.5 rounded hover:bg-neutral-100 hover:text-black border border-transparent hover:border-[#ECECEC]" title="Suivant" onClick={onForward}>
            <Icon className="w-5 h-5" d="M8.25 4.5L15.75 12l-7.5 7.5" />
          </button>
          <button className="p-1.5 rounded hover:bg-neutral-100 hover:text-black border border-transparent hover:border-[#ECECEC]" title="Recharger" onClick={onReload}>
            <Icon className="w-5 h-5" d="M4.5 12a7.5 7.5 0 0112.92-5.303M19.5 12a7.5 7.5 0 01-12.92 5.303M9 4.5h3.75V1.5" />
          </button>
        </div>

        {/* Barre de recherche (ouvre la palette) */}
        <div className="no-drag flex-1 flex justify-center">
          <button
            onClick={onOpenPalette}
            className="w-full max-w-xl flex items-center gap-3 px-5 py-2.5 rounded-full bg-white text-neutral-700 border border-[#ECECEC] hover:bg-neutral-50 shadow-[0_1px_0_#ECECEC,0_8px_20px_rgba(0,0,0,0.06)]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
            <span className="text-[15px] opacity-90 font-display">Rechercher ou entrer une URL…</span>
            <span className="ml-auto text-[11px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-[#ECECEC]">⌘T</span>
          </button>
        </div>

        {/* réserve droite (future actions) */}
        <div className="w-12" />
      </div>
    </div>
  )
}
