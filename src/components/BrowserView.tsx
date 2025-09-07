import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

type Props = {
  src: string
  className?: string
  onUrlChange?: (url: string) => void
  onTitleChange?: (title: string) => void
  onDownload?: (filename: string, url: string, size: number) => void
}

// Enhanced BrowserView handle with BrowserView API
export type BrowserViewHandle = {
  loadURL: (url: string) => void
  goBack: () => void
  goForward: () => void
  reload: () => void
  stop: () => void
  getURL: () => string
  getTitle: () => string
} | null

const BrowserView = forwardRef<BrowserViewHandle, Props>(function BrowserView(
  { src, className, onUrlChange, onTitleChange, onDownload },
  ref
) {
  const [tabId, setTabId] = useState<number | null>(null)
  const [currentUrl, setCurrentUrl] = useState(src)
  const [currentTitle, setCurrentTitle] = useState('')

  // Create enhanced handle that works with BrowserView backend
  useImperativeHandle(ref, () => ({
    loadURL: (url: string) => {
      if (tabId !== null) {
        ;(window as any).electronAPI?.navigateTab(tabId, url)
      }
    },
    goBack: () => {
      if (tabId !== null) {
        ;(window as any).electronAPI?.tabAction(tabId, 'back')
      }
    },
    goForward: () => {
      if (tabId !== null) {
        ;(window as any).electronAPI?.tabAction(tabId, 'forward')
      }
    },
    reload: () => {
      if (tabId !== null) {
        ;(window as any).electronAPI?.tabAction(tabId, 'reload')
      }
    },
    stop: () => {
      if (tabId !== null) {
        ;(window as any).electronAPI?.tabAction(tabId, 'stop')
      }
    },
    getURL: () => currentUrl,
    getTitle: () => currentTitle
  }))

  // Create and manage BrowserView tab
  useEffect(() => {
    let mounted = true
    
    const initializeTab = async () => {
      try {
        const electronAPI = (window as any).electronAPI
        if (!electronAPI) {
          console.warn('electronAPI not available, falling back to webview')
          return
        }
        
        // Create new tab with BrowserView backend
        const tab = await electronAPI.createTab(src)
        if (!mounted) return
        
        if (tab) {
          setTabId(tab.id)
          setCurrentUrl(tab.url)
          setCurrentTitle(tab.title)
          
          // Set as active tab
          await electronAPI.setActiveTab(tab.id)
        }
      } catch (error) {
        console.error('Failed to create BrowserView tab:', error)
      }
    }
    
    initializeTab()
    
    return () => {
      mounted = false
      // Cleanup: close tab when component unmounts
      if (tabId !== null) {
        ;(window as any).electronAPI?.closeTab(tabId)
      }
    }
  }, [])
  
  // Handle URL changes
  useEffect(() => {
    if (tabId !== null && src !== currentUrl) {
      ;(window as any).electronAPI?.navigateTab(tabId, src)
    }
  }, [src, tabId, currentUrl])

  // Listen to BrowserView tab events
  useEffect(() => {
    if (tabId === null) return
    
    const electronAPI = (window as any).electronAPI
    if (!electronAPI) return
    
    // Setup event listeners for this specific tab
    const cleanupFns: (() => void)[] = []
    
    // Navigation events
    const offNavigation = electronAPI.onTabNavigation?.((data: any) => {
      if (data.tabId === tabId) {
        setCurrentUrl(data.url)
        onUrlChange?.(data.url)
      }
    })
    if (offNavigation) cleanupFns.push(offNavigation)
    
    // Title updates
    const offTitle = electronAPI.onTabTitleUpdated?.((data: any) => {
      if (data.tabId === tabId) {
        setCurrentTitle(data.title)
        onTitleChange?.(data.title)
      }
    })
    if (offTitle) cleanupFns.push(offTitle)
    
    // Download events
    const offDownload = electronAPI.onTabDownloadStarted?.((data: any) => {
      if (data.tabId === tabId) {
        onDownload?.(data.filename, data.url, data.totalBytes)
      }
    })
    if (offDownload) cleanupFns.push(offDownload)
    
    return () => {
      cleanupFns.forEach(cleanup => cleanup())
    }
  }, [tabId, onUrlChange, onTitleChange, onDownload])


  // Render placeholder div - actual content is handled by BrowserView backend
  return (
    <div 
      className={`${className || ''} bg-white dark:bg-neutral-900 flex items-center justify-center`}
      style={{ width: '100%', height: '100%' }}
    >
      {tabId === null ? (
        <div className="text-neutral-500 dark:text-neutral-400">
          Loading...
        </div>
      ) : (
        // Invisible div that represents the BrowserView area
        <div className="w-full h-full" style={{ background: 'transparent' }} />
      )}
    </div>
  )
})

// Fallback to webview if BrowserView not available
if (typeof window !== 'undefined' && !(window as any).electronAPI?.createTab) {
  console.warn('BrowserView API not available, using webview fallback')
}

export default BrowserView
