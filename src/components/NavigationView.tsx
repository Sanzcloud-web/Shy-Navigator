import { motion } from 'framer-motion'
import { ArrowLeft, Search, Filter, Archive as ArchiveIcon } from 'lucide-react'
import type { HistoryEntry } from './ArchiveView'

export type DownloadEntry = {
  id: string
  filename: string
  url: string
  size: number
  downloadedAt: Date
  status: 'completed' | 'downloading' | 'failed'
  progress?: number
}

export type NavigationCategory = 'history'

type Props = {
  history: HistoryEntry[]
  onBack: () => void
  onSelectEntry: (entry: HistoryEntry) => void
  isVisible: boolean
}

export default function NavigationView({ 
  history, 
  onBack, 
  onSelectEntry,
  isVisible 
}: Props) {

  const formatDate = (date: Date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'  
    } else {
      return date.toLocaleDateString('fr-FR', { 
        month: 'short', 
        day: 'numeric' 
      })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.18 }}
      className="h-full w-full bg-white dark:bg-[#1F1F1F] text-neutral-900 dark:text-neutral-100"
    >
      {/* Header */}
      <div className="h-10 flex items-center gap-2 px-3 border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={onBack}
          className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 p-1 rounded no-drag"
          title="Retour aux onglets"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-sm font-medium">Archived Tabs</div>
        <button 
          className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 p-1 rounded"
          title="Filtrer"
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search Archive..."
            className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg pl-10 pr-4 py-2 text-sm outline-none"
          />
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto p-2 pb-16">
        <div className="space-y-1">
          {history.map((entry) => (
            <motion.div
              key={entry.id}
              onClick={() => onSelectEntry(entry)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer group transition-colors w-full overflow-hidden"
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
            >
              {entry.favicon ? (
                <img 
                  src={entry.favicon} 
                  alt="" 
                  className="w-4 h-4 rounded-sm flex-shrink-0"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-4 h-4 rounded-sm bg-neutral-300 dark:bg-neutral-600 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="text-sm font-medium truncate">{entry.title}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate break-all">
                  {entry.url}
                </div>
              </div>
              <div className="text-xs text-neutral-400 dark:text-neutral-500">
                {formatDate(entry.visitedAt)}
              </div>
            </motion.div>
          ))}
          {history.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-neutral-400 dark:text-neutral-500">
              <div className="text-sm">Aucun historique disponible</div>
              <div className="text-xs mt-1">L'historique de vos onglets apparaîtra ici</div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
