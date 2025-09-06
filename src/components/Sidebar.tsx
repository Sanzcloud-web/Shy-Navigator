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
        'relative z-10 h-full bg-white dark:bg-[#1F1F1F] text-neutral-900 dark:text-neutral-100 transition-all duration-200 ease-out select-none',
        collapsed ? 'w-12' : 'w-64'
      )}
    >
      <div className="h-10 flex items-center gap-2 px-2">
        <button
          className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 px-2 py-1 rounded no-drag"
          onClick={onToggleCollapsed}
          title={collapsed ? 'Afficher la sidebar' : 'Cacher la sidebar'}
        >
          {collapsed ? '›' : '‹'}
        </button>
        {!collapsed && <div className="text-sm font-medium">Onglets</div>}
        <div className="flex-1" />
        {!collapsed && (
          <button className="text-xs bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded px-2 py-1" onClick={onNewTab}>+ New</button>
        )}
      </div>

      <div className="overflow-y-auto py-2 space-y-1">
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={clsx(
              'mx-2 rounded-lg flex items-center gap-2 px-2 py-2 cursor-pointer group',
              activeId === tab.id ? 'bg-neutral-100 dark:bg-neutral-800' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
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
              className={clsx('text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 no-drag', collapsed && 'hidden')}
              onClick={(e) => { e.stopPropagation(); onClose(tab.id) }}
              title="Fermer"
            >×</button>
          </div>
        ))}
        {tabs.length === 0 && !collapsed && (
          <div className="mx-2 mt-4 text-neutral-500 dark:text-neutral-400 text-sm">Aucun onglet. Cmd+T pour rechercher…</div>
        )}
      </div>

      {/* Drag handled by the TopBar; no overlay here to avoid stacking issues */}
    </div>
  )}
