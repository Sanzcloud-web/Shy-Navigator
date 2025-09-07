import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

type Props = {
  tabId?: number // Receive tabId from parent instead of creating one
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
  { tabId: externalTabId, src, className, onUrlChange, onTitleChange, onDownload },
  ref
) {
  const [currentUrl, setCurrentUrl] = useState(src)
  const [currentTitle, setCurrentTitle] = useState('')

  // Create enhanced handle that works with BrowserView backend
  useImperativeHandle(ref, () => ({
    loadURL: (url: string) => {
      if (externalTabId !== undefined) {
        ;(window as any).electronAPI?.navigateTab(externalTabId, url)
      }
    },
    goBack: () => {
      if (externalTabId !== undefined) {
        ;(window as any).electronAPI?.tabAction(externalTabId, 'back')
      }
    },
    goForward: () => {
      if (externalTabId !== undefined) {
        ;(window as any).electronAPI?.tabAction(externalTabId, 'forward')
      }
    },
    reload: () => {
      if (externalTabId !== undefined) {
        ;(window as any).electronAPI?.tabAction(externalTabId, 'reload')
      }
    },
    stop: () => {
      if (externalTabId !== undefined) {
        ;(window as any).electronAPI?.tabAction(externalTabId, 'stop')
      }
    },
    getURL: () => currentUrl,
    getTitle: () => currentTitle
  }))

  // Handle URL changes when src prop changes
  useEffect(() => {
    if (externalTabId !== undefined && src !== currentUrl) {
      ;(window as any).electronAPI?.navigateTab(externalTabId, src)
    }
  }, [src, externalTabId, currentUrl])

  // Listen to BrowserView tab events
  useEffect(() => {
    if (externalTabId === undefined) return
    
    const electronAPI = (window as any).electronAPI
    if (!electronAPI) return
    
    // Setup event listeners for this specific tab
    const cleanupFns: (() => void)[] = []
    
    // Navigation events
    const offNavigation = electronAPI.onTabNavigation?.((data: any) => {
      if (data.tabId === externalTabId) {
        setCurrentUrl(data.url)
        onUrlChange?.(data.url)
      }
    })
    if (offNavigation) cleanupFns.push(offNavigation)
    
    // Title updates
    const offTitle = electronAPI.onTabTitleUpdated?.((data: any) => {
      if (data.tabId === externalTabId) {
        setCurrentTitle(data.title)
        onTitleChange?.(data.title)
      }
    })
    if (offTitle) cleanupFns.push(offTitle)
    
    // Download events
    const offDownload = electronAPI.onTabDownloadStarted?.((data: any) => {
      if (data.tabId === externalTabId) {
        onDownload?.(data.filename, data.url, data.totalBytes)
      }
    })
    if (offDownload) cleanupFns.push(offDownload)
    
    return () => {
      cleanupFns.forEach(cleanup => cleanup())
    }
  }, [externalTabId, onUrlChange, onTitleChange, onDownload])


  // Render placeholder div - actual content is handled by BrowserView backend
  return (
    <div 
      className={`${className || ''} bg-white dark:bg-neutral-900 flex items-center justify-center`}
      style={{ width: '100%', height: '100%' }}
    >
      {externalTabId === undefined ? (
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
