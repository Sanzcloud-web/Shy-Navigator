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

  useEffect(() => {
    const wv = wvRef.current
    if (!wv) return
    try {
      // @ts-ignore - Electron runtime method
      wv.loadURL?.(src)
    } catch {
      wv.src = src
    }
  }, [src])

  useEffect(() => {
    const wv = wvRef.current
    if (!wv) return
    
    const onNav = () => {
      // @ts-ignore - Electron runtime method
      const current = (wv as any).getURL?.() || wv.getAttribute('src') || src
      onUrlChange?.(current)
    }
    
    const onTitle = (e: any) => onTitleChange?.(e.title || '')
    
    // Gestionnaire de téléchargements simple - seulement les vrais téléchargements
    const onWillDownload = (e: any) => {
      console.log('📥 Download started:', e)
      if (onDownload && e.item) {
        const filename = e.item.getFilename() || 'download'
        const url = e.item.getURL() || ''
        const size = e.item.getTotalBytes() || 0
        onDownload(filename, url, size)
      }
    }
    
    // Utiliser seulement les événements essentiels pour un comportement plus naturel
    wv.addEventListener('did-navigate', onNav as any)
    wv.addEventListener('page-title-updated', onTitle as any)
    wv.addEventListener('will-download', onWillDownload as any)
    
    return () => {
      wv.removeEventListener('did-navigate', onNav as any)
      wv.removeEventListener('page-title-updated', onTitle as any)
      wv.removeEventListener('will-download', onWillDownload as any)
    }
  }, [src, onUrlChange, onTitleChange, onDownload])


  return (
    // @ts-ignore - custom element in React
    <webview 
      ref={wvRef as any} 
      src={src} 
      className={className || ''} 
      allowpopups={false}
      nodeintegration={false}
      webpreferences="sandbox=true,contextIsolation=true,nodeIntegration=false,nodeIntegrationInWorker=false,nodeIntegrationInSubFrames=false,enableRemoteModule=false"
    />
  )
})

export default BrowserView
