import clsx from 'clsx'

export type Tab = {
  id: string
  title?: string
  url: string
}

type Props = {
  tabs: Tab[]
  activeId?: string
  collapsed: boolean
  onToggleCollapsed: () => void
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onNewTab: () => void
}

export default function Sidebar({ tabs, activeId, collapsed, onToggleCollapsed, onSelect, onClose, onNewTab }: Props) {
  return (
    <div
      className={clsx(
        'relative z-10 h-full bg-gradient-to-b from-[#0f0f13] to-[#12121a] text-neutral-200 border-r border-neutral-800 transition-all duration-200 ease-out select-none',
        collapsed ? 'w-12' : 'w-64'
      )}
    >
      <div className="h-10 flex items-center gap-2 px-2 border-b border-neutral-800">
        <button
          className="text-neutral-400 hover:text-neutral-100 px-2 py-1 rounded no-drag"
          onClick={onToggleCollapsed}
          title={collapsed ? 'Afficher la sidebar' : 'Cacher la sidebar'}
        >
          {collapsed ? '›' : '‹'}
        </button>
        {!collapsed && <div className="text-sm font-medium">Onglets</div>}
        <div className="flex-1" />
        {!collapsed && (
          <button className="text-xs bg-neutral-800 hover:bg-neutral-700 rounded px-2 py-1" onClick={onNewTab}>+ New</button>
        )}
      </div>

      <div className="overflow-y-auto py-2 space-y-1">
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={clsx(
              'mx-2 rounded flex items-center gap-2 px-2 py-2 cursor-pointer group',
              activeId === tab.id ? 'bg-neutral-800' : 'hover:bg-neutral-800/70'
            )}
          >
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            {!collapsed && (
              <div className="flex-1 truncate text-sm">
                {tab.title || tab.url.replace(/^https?:\/\//, '')}
              </div>
            )}
            <button
              className={clsx('text-neutral-400 hover:text-neutral-200 no-drag', collapsed && 'hidden')}
              onClick={(e) => { e.stopPropagation(); onClose(tab.id) }}
              title="Fermer"
            >×</button>
          </div>
        ))}
        {tabs.length === 0 && !collapsed && (
          <div className="mx-2 mt-4 text-neutral-400 text-sm">Aucun onglet. Cmd+T pour rechercher…</div>
        )}
      </div>

      {/* Drag handled by the TopBar; no overlay here to avoid stacking issues */}
    </div>
  )}
