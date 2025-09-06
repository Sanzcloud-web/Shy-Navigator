import clsx from 'clsx'
import { getDomainName } from '../lib/favicon'

export type Tab = {
  id: string
  title?: string
  url: string
  favicon?: string
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
        'relative z-10 h-full bg-white text-neutral-900 border-r border-[#ECECEC] transition-all duration-200 ease-out select-none',
        collapsed ? 'w-12' : 'w-64'
      )}
    >
      <div className="h-10 flex items-center gap-2 px-2 border-b border-[#ECECEC]">
        <button
          className="text-neutral-600 hover:text-neutral-900 px-2 py-1 rounded no-drag"
          onClick={onToggleCollapsed}
          title={collapsed ? 'Afficher la sidebar' : 'Cacher la sidebar'}
        >
          {collapsed ? '›' : '‹'}
        </button>
        {!collapsed && <div className="text-sm font-medium">Onglets</div>}
        <div className="flex-1" />
        {!collapsed && (
          <button className="text-xs bg-white border border-[#ECECEC] hover:bg-neutral-50 rounded px-2 py-1" onClick={onNewTab}>+ New</button>
        )}
      </div>

      <div className="overflow-y-auto py-2 space-y-1">
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={clsx(
              'mx-2 rounded-lg flex items-center gap-2 px-2 py-2 cursor-pointer group',
              activeId === tab.id ? 'bg-neutral-100 border border-[#ECECEC]' : 'hover:bg-neutral-50'
            )}
          >
            {tab.favicon && !collapsed ? (
              <img 
                src={tab.favicon} 
                alt="" 
                className="w-4 h-4 rounded-sm flex-shrink-0"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            ) : (
              <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
            )}
            {!collapsed && (
              <div className="flex-1 truncate text-sm">
                {tab.title || getDomainName(tab.url)}
              </div>
            )}
            <button
              className={clsx('text-neutral-500 hover:text-neutral-700 no-drag', collapsed && 'hidden')}
              onClick={(e) => { e.stopPropagation(); onClose(tab.id) }}
              title="Fermer"
            >×</button>
          </div>
        ))}
        {tabs.length === 0 && !collapsed && (
          <div className="mx-2 mt-4 text-neutral-500 text-sm">Aucun onglet. Cmd+T pour rechercher…</div>
        )}
      </div>

      {/* Drag handled by the TopBar; no overlay here to avoid stacking issues */}
    </div>
  )}
