import clsx from 'clsx'
import { getDomainName } from '../lib/favicon'
import { Moon, Sun, Archive } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ArchiveView, { type HistoryEntry } from './ArchiveView'

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
  sidebarHovered?: boolean
  isDark?: boolean
  showArchive?: boolean
  history?: HistoryEntry[]
  onToggleCollapsed: () => void
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onNewTab: () => void
  onToggleTheme?: () => void
  onToggleArchive?: () => void
  onHistorySelect?: (entry: HistoryEntry) => void
}

export default function Sidebar({ tabs, activeId, collapsed, sidebarHovered, isDark, showArchive, history = [], onToggleCollapsed, onSelect, onClose, onNewTab, onToggleTheme, onToggleArchive, onHistorySelect }: Props) {
  const isVisible = !collapsed || sidebarHovered
  return (
    <div
      className={clsx(
        'relative z-10 h-full bg-white dark:bg-[#1F1F1F] text-neutral-900 dark:text-neutral-100 transition-all duration-300 ease-out select-none',
        collapsed && !sidebarHovered ? 'w-0 overflow-hidden' : 'w-64',
        collapsed && sidebarHovered && 'shadow-2xl border-r border-neutral-200 dark:border-neutral-800'
      )}
    >
      <AnimatePresence mode="wait">
        {showArchive ? (
          <motion.div
            key="archive"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="h-full"
          >
            <ArchiveView
              history={history}
              onBack={onToggleArchive || (() => {})}
              onSelectEntry={onHistorySelect || (() => {})}
              isVisible={isVisible}
            />
          </motion.div>
        ) : (
          <motion.div
            key="tabs"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="h-full"
          >
            <div className="h-10 flex items-center gap-2 px-2">
              <button
                className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 px-2 py-1 rounded no-drag"
                onClick={onToggleCollapsed}
                title={collapsed ? 'Afficher la sidebar' : 'Cacher la sidebar'}
              >
                {collapsed ? '›' : '‹'}
              </button>
              {isVisible && <div className="text-sm font-medium">Onglets</div>}
              <div className="flex-1" />
              {isVisible && (
                <button className="text-xs bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded px-2 py-1" onClick={onNewTab}>+ New</button>
              )}
            </div>

            <div className="overflow-y-auto py-2 space-y-1 pb-16">
              {tabs.map(tab => (
                <motion.div
                  key={tab.id}
                  onClick={() => onSelect(tab.id)}
                  className={clsx(
                    'mx-2 rounded-lg flex items-center gap-2 px-2 py-2 cursor-pointer group',
                    activeId === tab.id ? 'bg-neutral-100 dark:bg-neutral-800' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                  )}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {tab.favicon && isVisible ? (
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
                  {isVisible && (
                    <div className="flex-1 truncate text-sm">
                      {tab.title || getDomainName(tab.url)}
                    </div>
                  )}
                  <button
                    className={clsx('text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 no-drag', !isVisible && 'hidden')}
                    onClick={(e) => { e.stopPropagation(); onClose(tab.id) }}
                    title="Fermer"
                  >×</button>
                </motion.div>
              ))}
              {tabs.length === 0 && isVisible && (
                <div className="mx-2 mt-4 text-neutral-500 dark:text-neutral-400 text-sm">Aucun onglet. Cmd+T pour rechercher…</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Boutons en bas de la sidebar */}
      <div className="absolute bottom-4 left-2 right-2 space-y-2">
        {/* Boutons thème et archive */}
        <div className="flex gap-2">
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors',
              )}
              title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {isVisible && (
                <span className="text-sm">
                  {isDark ? 'Clair' : 'Sombre'}
                </span>
              )}
            </button>
          )}
          {onToggleArchive && (
            <button
              onClick={onToggleArchive}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors',
                showArchive && 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
              )}
              title="Historique des onglets"
            >
              <Archive className="w-4 h-4" />
              {isVisible && (
                <span className="text-sm">Historique</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Drag handled by the TopBar; no overlay here to avoid stacking issues */}
    </div>
  )}
