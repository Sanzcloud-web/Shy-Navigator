import { motion } from 'framer-motion'
import { ArrowLeft, Search, Filter, Image, Download, History, Zap, Folder, Archive as ArchiveIcon } from 'lucide-react'
import clsx from 'clsx'
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

export type NavigationCategory = 'history' | 'downloads' | 'media' | 'easels' | 'spaces' | 'boosts'

type Props = {
  activeCategory: NavigationCategory
  history: HistoryEntry[]
  downloads: DownloadEntry[]
  onBack: () => void
  onCategoryChange: (category: NavigationCategory) => void
  onSelectEntry: (entry: HistoryEntry) => void
  onSelectDownload: (entry: DownloadEntry) => void
  onTestDownload?: () => void
  isVisible: boolean
}

const categories = [
  { id: 'media' as NavigationCategory, label: 'Media', icon: Image, color: 'text-blue-500' },
  { id: 'downloads' as NavigationCategory, label: 'Downloads', icon: Download, color: 'text-green-500' },
  { id: 'easels' as NavigationCategory, label: 'Easels', icon: Zap, color: 'text-yellow-500' },
  { id: 'spaces' as NavigationCategory, label: 'Spaces', icon: Folder, color: 'text-purple-500' },
  { id: 'boosts' as NavigationCategory, label: 'Boosts', icon: Zap, color: 'text-orange-500' },
  { id: 'history' as NavigationCategory, label: 'Archived Tabs', icon: ArchiveIcon, color: 'text-neutral-500' },
]

export default function NavigationView({ 
  activeCategory, 
  history, 
  downloads, 
  onBack, 
  onCategoryChange, 
  onSelectEntry,
  onSelectDownload,
  onTestDownload,
  isVisible 
}: Props) {

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

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

  const renderContent = () => {
    switch (activeCategory) {
      case 'history':
        return (
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
              </div>
            )}
          </div>
        )

      case 'downloads':
        return (
          <div className="space-y-1">
            {downloads.map((entry) => (
              <motion.div
                key={entry.id}
                onClick={() => onSelectDownload(entry)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer group transition-colors w-full overflow-hidden"
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-4 h-4 rounded-sm bg-green-500 dark:bg-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="text-sm font-medium truncate">{entry.filename}</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate flex items-center gap-2">
                    <span>{formatFileSize(entry.size)}</span>
                    <span className={clsx(
                      'px-2 py-0.5 rounded-full text-xs',
                      entry.status === 'completed' && 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                      entry.status === 'downloading' && 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                      entry.status === 'failed' && 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    )}>
                      {entry.status}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-neutral-400 dark:text-neutral-500">
                  {formatDate(entry.downloadedAt)}
                </div>
              </motion.div>
            ))}
            {downloads.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 text-neutral-400 dark:text-neutral-500">
                <div className="text-sm">Aucun téléchargement</div>
                {onTestDownload && (
                  <button 
                    onClick={onTestDownload}
                    className="mt-3 px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Ajouter un test
                  </button>
                )}
              </div>
            )}
          </div>
        )

      default:
        return (
          <div className="flex flex-col items-center justify-center h-32 text-neutral-400 dark:text-neutral-500">
            <div className="text-sm">Fonctionnalité à venir</div>
            <div className="text-xs mt-1">Cette section sera bientôt disponible</div>
          </div>
        )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.18 }}
      className="h-full w-full bg-white dark:bg-[#1F1F1F] text-neutral-900 dark:text-neutral-100 flex"
    >
      {/* Sidebar des catégories */}
      <div className="w-32 bg-white dark:bg-[#1F1F1F] p-2">
        <div className="space-y-1">
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={clsx(
                  'w-full flex flex-col items-center gap-2 px-2 py-3 rounded-lg text-xs transition-colors',
                  activeCategory === category.id
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 '
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-white/50 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-neutral-100'
                )}
              >
                <Icon className={clsx('w-5 h-5', activeCategory === category.id ? category.color : '')} />
                <span className="font-medium">{category.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-10 flex items-center gap-2 px-3">
          <button
            onClick={onBack}
            className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 p-1 rounded no-drag"
            title="Retour aux onglets"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 text-sm font-medium">
            {categories.find(c => c.id === activeCategory)?.label}
          </div>
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
              placeholder={`Search ${categories.find(c => c.id === activeCategory)?.label}...`}
              className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg pl-10 pr-4 py-2 text-sm outline-none"
            />
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-2">
          {renderContent()}
        </div>
      </div>
    </motion.div>
  )
}
