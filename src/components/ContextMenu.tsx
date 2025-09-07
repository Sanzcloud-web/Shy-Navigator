import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Copy, 
  Scissors, 
  ClipboardPaste, 
  MousePointer2,
  RotateCcw,
  Search,
  ExternalLink,
  Download,
  Settings,
  Moon,
  Sun,
  Minimize2,
  Maximize2,
  Archive,
  Plus
} from 'lucide-react'
import { useEffect, useRef } from 'react'

export interface MenuPosition {
  x: number
  y: number
}

export interface MenuItem {
  id: string
  label: string
  icon?: React.ReactNode
  action: () => void
  separator?: boolean
  disabled?: boolean
  shortcut?: string
  submenu?: MenuItem[]
}

type Props = {
  isOpen: boolean
  position: MenuPosition
  items: MenuItem[]
  onClose: () => void
  isDark?: boolean
}

export default function ContextMenu({ isOpen, position, items, onClose, isDark }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on click outside or escape
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  // Adjust position to stay within viewport
  const getAdjustedPosition = () => {
    if (!menuRef.current) return position

    const rect = menuRef.current.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    let { x, y } = position

    // Adjust horizontal position
    if (x + rect.width > viewport.width) {
      x = viewport.width - rect.width - 8
    }
    if (x < 8) x = 8

    // Adjust vertical position
    if (y + rect.height > viewport.height) {
      y = viewport.height - rect.height - 8
    }
    if (y < 8) y = 8

    return { x, y }
  }

  const renderMenuItem = (item: MenuItem, index: number) => {
    if (item.separator) {
      return (
        <div 
          key={`separator-${index}`} 
          className="h-px bg-neutral-200 dark:bg-neutral-700 my-1"
        />
      )
    }

    return (
      <motion.button
        key={item.id}
        onClick={() => {
          if (!item.disabled) {
            item.action()
            onClose()
          }
        }}
        disabled={item.disabled}
        className={`
          w-full flex items-center gap-3 px-3 py-2 text-left text-sm rounded-md
          transition-colors duration-150
          ${item.disabled 
            ? 'text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }
        `}
        whileHover={!item.disabled ? { x: 2 } : {}}
        whileTap={!item.disabled ? { scale: 0.98 } : {}}
      >
        {item.icon && (
          <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
            {item.icon}
          </span>
        )}
        <span className="flex-1">{item.label}</span>
        {item.shortcut && (
          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
            {item.shortcut}
          </span>
        )}
      </motion.button>
    )
  }

  if (!isOpen) return null

  const adjustedPosition = getAdjustedPosition()

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999]"> {/* Very high z-index */}
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="absolute bg-white dark:bg-[#2A2A2A] border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-2xl py-2 min-w-[220px] max-w-[280px]"
          style={{
            left: adjustedPosition.x,
            top: adjustedPosition.y,
          }}
        >
          {items.map(renderMenuItem)}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// Predefined menu items for common actions
export const createAppMenuItems = (handlers: {
  onNewTab: () => void
  onToggleSidebar: () => void
  onToggleTheme: () => void
  onShowArchive: () => void
  onReload: () => void
  onToggleDevTools: () => void
  onMinimize: () => void
  onMaximize: () => void
  onClose: () => void
  isDark: boolean
}): MenuItem[] => [
  {
    id: 'new-tab',
    label: 'New Tab',
    icon: <Plus className="w-4 h-4" />,
    action: handlers.onNewTab,
    shortcut: '⌘T'
  },
  {
    id: 'sep-1',
    label: '',
    action: () => {},
    separator: true
  },
  {
    id: 'toggle-sidebar',
    label: 'Toggle Sidebar',
    icon: <Archive className="w-4 h-4" />,
    action: handlers.onToggleSidebar,
    shortcut: '⌘S'
  },
  {
    id: 'show-archive',
    label: 'Show Archive',
    icon: <Archive className="w-4 h-4" />,
    action: handlers.onShowArchive
  },
  {
    id: 'sep-2',
    label: '',
    action: () => {},
    separator: true
  },
  {
    id: 'reload',
    label: 'Reload Page',
    icon: <RotateCcw className="w-4 h-4" />,
    action: handlers.onReload,
    shortcut: '⌘R'
  },
  {
    id: 'toggle-theme',
    label: handlers.isDark ? 'Light Mode' : 'Dark Mode',
    icon: handlers.isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
    action: handlers.onToggleTheme
  },
  {
    id: 'sep-3',
    label: '',
    action: () => {},
    separator: true
  },
  {
    id: 'dev-tools',
    label: 'Developer Tools',
    icon: <Settings className="w-4 h-4" />,
    action: handlers.onToggleDevTools,
    shortcut: '⌘⌥I'
  },
  {
    id: 'sep-4',
    label: '',
    action: () => {},
    separator: true
  },
  {
    id: 'minimize',
    label: 'Minimize',
    icon: <Minimize2 className="w-4 h-4" />,
    action: handlers.onMinimize,
    shortcut: '⌘M'
  },
  {
    id: 'maximize',
    label: 'Zoom',
    icon: <Maximize2 className="w-4 h-4" />,
    action: handlers.onMaximize
  },
  {
    id: 'close',
    label: 'Close Window',
    icon: <X className="w-4 h-4" />,
    action: handlers.onClose,
    shortcut: '⌘W'
  }
]

// Context menu items for webpage content
export const createWebpageMenuItems = (params: {
  canCut?: boolean
  canCopy?: boolean
  canPaste?: boolean
  canSelectAll?: boolean
  linkURL?: string
  mediaType?: 'image' | 'video' | null
  srcURL?: string
  selectionText?: string
  onCut: () => void
  onCopy: () => void
  onPaste: () => void
  onSelectAll: () => void
  onCopyLink: () => void
  onCopyImage: () => void
  onSearchSelection: (text: string) => void
  onOpenLinkInNewTab: (url: string) => void
}): MenuItem[] => {
  const items: MenuItem[] = []

  // Edit actions
  if (params.canCut) {
    items.push({
      id: 'cut',
      label: 'Cut',
      icon: <Scissors className="w-4 h-4" />,
      action: params.onCut,
      shortcut: '⌘X'
    })
  }

  if (params.canCopy) {
    items.push({
      id: 'copy',
      label: 'Copy',
      icon: <Copy className="w-4 h-4" />,
      action: params.onCopy,
      shortcut: '⌘C'
    })
  }

  if (params.canPaste) {
    items.push({
      id: 'paste',
      label: 'Paste',
      icon: <ClipboardPaste className="w-4 h-4" />,
      action: params.onPaste,
      shortcut: '⌘V'
    })
  }

  if (params.canSelectAll) {
    if (items.length > 0) {
      items.push({ id: 'sep-1', label: '', action: () => {}, separator: true })
    }
    items.push({
      id: 'select-all',
      label: 'Select All',
      icon: <MousePointer2 className="w-4 h-4" />,
      action: params.onSelectAll,
      shortcut: '⌘A'
    })
  }

  // Link actions
  if (params.linkURL) {
    items.push({ id: 'sep-link', label: '', action: () => {}, separator: true })
    items.push({
      id: 'open-link-new-tab',
      label: 'Open Link in New Tab',
      icon: <ExternalLink className="w-4 h-4" />,
      action: () => params.onOpenLinkInNewTab(params.linkURL!)
    })
    items.push({
      id: 'copy-link',
      label: 'Copy Link Address',
      icon: <Copy className="w-4 h-4" />,
      action: params.onCopyLink
    })
  }

  // Image actions
  if (params.mediaType === 'image') {
    items.push({ id: 'sep-image', label: '', action: () => {}, separator: true })
    items.push({
      id: 'copy-image',
      label: 'Copy Image',
      icon: <Copy className="w-4 h-4" />,
      action: params.onCopyImage
    })
    if (params.srcURL) {
      items.push({
        id: 'copy-image-address',
        label: 'Copy Image Address',
        icon: <Copy className="w-4 h-4" />,
        action: () => params.onCopyLink()
      })
    }
  }

  // Search selection
  if (params.selectionText && params.selectionText.trim()) {
    items.push({ id: 'sep-search', label: '', action: () => {}, separator: true })
    const truncatedText = params.selectionText.length > 20 
      ? `${params.selectionText.substring(0, 20)}...`
      : params.selectionText
    items.push({
      id: 'search-selection',
      label: `Search Google for "${truncatedText}"`,
      icon: <Search className="w-4 h-4" />,
      action: () => params.onSearchSelection(params.selectionText!)
    })
  }

  return items
}