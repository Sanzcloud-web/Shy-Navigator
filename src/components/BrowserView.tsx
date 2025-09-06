import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { WebviewTag } from 'electron'

type Props = {
  src: string
  className?: string
  onUrlChange?: (url: string) => void
  onTitleChange?: (title: string) => void
}

export type BrowserViewHandle = WebviewTag | null

const BrowserView = forwardRef<BrowserViewHandle, Props>(function BrowserView(
  { src, className, onUrlChange, onTitleChange },
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
    wv.addEventListener('did-navigate-in-page', onNav as any)
    wv.addEventListener('did-navigate', onNav as any)
    wv.addEventListener('page-title-updated', onTitle as any)
    return () => {
      wv.removeEventListener('did-navigate-in-page', onNav as any)
      wv.removeEventListener('did-navigate', onNav as any)
      wv.removeEventListener('page-title-updated', onTitle as any)
    }
  }, [src, onUrlChange, onTitleChange])


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

