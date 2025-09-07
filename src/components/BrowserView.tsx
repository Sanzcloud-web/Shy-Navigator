import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { WebviewTag } from 'electron'

type Props = {
  src: string
  className?: string
  onUrlChange?: (url: string) => void
  onTitleChange?: (title: string) => void
  onDownload?: (filename: string, url: string, size: number) => void
}

export type BrowserViewHandle = WebviewTag | null

const BrowserView = forwardRef<BrowserViewHandle, Props>(function BrowserView(
  { src, className, onUrlChange, onTitleChange, onDownload },
  ref
) {
  const wvRef = useRef<WebviewTag | null>(null)

  useImperativeHandle(ref, () => wvRef.current)

  // Keep latest callbacks without retriggering effects
  const onUrlChangeRef = useRef(onUrlChange)
  const onTitleChangeRef = useRef(onTitleChange)
  const onDownloadRef = useRef(onDownload)
  useEffect(() => { onUrlChangeRef.current = onUrlChange }, [onUrlChange])
  useEffect(() => { onTitleChangeRef.current = onTitleChange }, [onTitleChange])
  useEffect(() => { onDownloadRef.current = onDownload }, [onDownload])

  useEffect(() => {
    const wv = wvRef.current
    if (!wv) return
    // Optionnel: augmenter la limite de listeners (debug only)
    try { (wv as any).setMaxListeners?.(20) } catch {}
  }, [])

  const srcRef = useRef(src)
  useEffect(() => { srcRef.current = src }, [src])

  useEffect(() => {
    const wv = wvRef.current
    if (!wv) return
    
    // Augmenter la limite des listeners pour éviter le warning
    try {
      (wv as any).setMaxListeners?.(25);
    } catch (e) {
      // Ignore si la méthode n'existe pas
    }
    
    const onNav = () => {
      try {
        // @ts-ignore - Electron runtime method
        const current = (wv as any).getURL?.() || wv.getAttribute('src') || srcRef.current
        onUrlChangeRef.current?.(current)
      } catch (error) {
        console.log('Navigation error:', error)
      }
    }
    
    const onTitle = (e: any) => {
      try {
        onTitleChangeRef.current?.(e.title || '')
      } catch (error) {
        console.log('Title error:', error)
      }
    }

    const onWillNavigate = (e: any) => {
      try {
        const nextUrl = e.url || ''
        onUrlChangeRef.current?.(nextUrl)
      } catch {}
    }

    const onNewWindow = (e: any) => {
      // Ouvrir les liens target=_blank dans le même webview (ou nouvelle tab si vous préférez)
      try {
        const targetUrl = e.url
        if (!targetUrl) return
        if ((wv as any).loadURL) {
          // @ts-ignore
          ;(wv as any).loadURL(targetUrl)
        } else {
          wv.setAttribute('src', targetUrl)
        }
      } catch (error) {
        console.log('new-window handler error:', error)
      }
    }
    
    // Gestionnaire de téléchargements natif d'Electron
    const onWillDownload = (e: any) => {
      try {
        console.log('📥 Native download started:', e)
        if (onDownloadRef.current && e.item) {
          const filename = e.item.getFilename() || 'download'
          const url = e.item.getURL() || ''
          const size = e.item.getTotalBytes() || 0
          onDownloadRef.current(filename, url, size)
        }
      } catch (error) {
        console.log('Download error:', error)
      }
    }
    
    // Gestionnaire d'erreurs pour éviter les crashes
    const onError = (e: any) => {
      console.log('Webview error (non-critical):', e.errorDescription || e.message)
    }
    
    wv.addEventListener('did-navigate-in-page', onNav)
    wv.addEventListener('did-navigate', onNav)
    wv.addEventListener('page-title-updated', onTitle)
    wv.addEventListener('will-navigate', onWillNavigate as any)
    // @ts-ignore 'new-window' is a valid webview event in Electron
    wv.addEventListener('new-window', onNewWindow as any)
    wv.addEventListener('will-download', onWillDownload)
    wv.addEventListener('did-fail-load', onError)
    
    return () => {
      try {
        wv.removeEventListener('did-navigate-in-page', onNav)
        wv.removeEventListener('did-navigate', onNav)
        wv.removeEventListener('page-title-updated', onTitle)
        wv.removeEventListener('will-navigate', onWillNavigate as any)
        // @ts-ignore
        wv.removeEventListener('new-window', onNewWindow as any)
        wv.removeEventListener('will-download', onWillDownload)
        wv.removeEventListener('did-fail-load', onError)
      } catch (error) {
        console.log('Cleanup error (non-critical):', error)
      }
    }
  }, [])


  return (
    // @ts-ignore - custom element in React
    <webview 
      ref={wvRef as any} 
      src={src} 
      className={className || ''} 
      allowpopups
    />
  )
})

export default BrowserView
