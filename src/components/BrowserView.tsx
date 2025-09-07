import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

type Props = {
  src: string
  className?: string
  browserViewId?: number // ID of the BrowserView tab
  onUrlChange?: (url: string) => void
  onTitleChange?: (title: string) => void
  onDownload?: (filename: string, url: string, size: number) => void
}

// Handle to control the BrowserView in main via IPC
export type BrowserViewHandle = {
  loadURL: (url: string) => Promise<void>
  goBack: () => Promise<void>
  goForward: () => Promise<void>
  reload: () => Promise<void>
  stop: () => Promise<void>
  getURL: () => string
  getTitle: () => string
} | null

const BrowserView = forwardRef<BrowserViewHandle, Props>(function BrowserView(
  { src, className, browserViewId },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Measure container and send bounds to main so BrowserView fits this area
  useEffect(() => {
    if (!browserViewId) return
    const el = containerRef.current
    if (!el) return
    const sendBounds = () => {
      try {
        const rect = el.getBoundingClientRect()
        const electronAPI = (window as any).electronAPI
        electronAPI?.setTabBounds?.(browserViewId, {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.max(1, Math.round(rect.width)),
          height: Math.max(1, Math.round(rect.height))
        })
      } catch {}
    }
    // Initial
    sendBounds()
    // Observe size changes
    const ro = new ResizeObserver(() => sendBounds())
    ro.observe(el)
    // Also on window resize/scroll (in case layout shifts)
    const onResize = () => sendBounds()
    const onScroll = () => sendBounds()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      try { ro.disconnect() } catch {}
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [browserViewId])

  // Expose a small imperative API bound to this BrowserView tab
  useImperativeHandle(ref, () => ({
    loadURL: async (url: string) => {
      if (browserViewId) {
        const electronAPI = (window as any).electronAPI
        if (electronAPI?.navigateTab) await electronAPI.navigateTab(browserViewId, url)
      }
    },
    goBack: async () => {
      if (browserViewId) {
        const electronAPI = (window as any).electronAPI
        if (electronAPI?.tabAction) await electronAPI.tabAction(browserViewId, 'back')
      }
    },
    goForward: async () => {
      if (browserViewId) {
        const electronAPI = (window as any).electronAPI
        if (electronAPI?.tabAction) await electronAPI.tabAction(browserViewId, 'forward')
      }
    },
    reload: async () => {
      if (browserViewId) {
        const electronAPI = (window as any).electronAPI
        if (electronAPI?.tabAction) await electronAPI.tabAction(browserViewId, 'reload')
      }
    },
    stop: async () => {
      if (browserViewId) {
        const electronAPI = (window as any).electronAPI
        if (electronAPI?.tabAction) await electronAPI.tabAction(browserViewId, 'stop')
      }
    },
    getURL: () => src,
    getTitle: () => 'Shy Navigator'
  }))

  // Render an invisible container reserving space for the BrowserView.
  // The actual web content is displayed by Electron's BrowserView beneath the UI.
  return (
    <div
      ref={containerRef}
      className={`${className || ''} bg-transparent relative pointer-events-none`}
      style={{ width: '100%', height: '100%' }}
    >
      {!browserViewId && (
        <div className="absolute inset-0 flex items-center justify-center text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-900 pointer-events-none">
          Loading browser view...
        </div>
      )}
    </div>
  )
})

export default BrowserView
