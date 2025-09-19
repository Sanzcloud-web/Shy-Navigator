import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

type Props = {
  src: string
  className?: string
  onUrlChange?: (url: string) => void
  onTitleChange?: (title: string) => void
  onDownload?: (filename: string, url: string, size: number) => void
}

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
  const wvRef = useRef<any>(null)
  const titleRef = useRef<string>('Shy Navigator')
  const urlRef = useRef<string>(src)

  useImperativeHandle(ref, () => ({
    loadURL: (url: string) => {
      try { (wvRef.current as any)?.loadURL?.(url) ?? ((wvRef.current as any).src = url) } catch {}
    },
    goBack: () => { try { (wvRef.current as any)?.goBack?.() } catch {} },
    goForward: () => { try { (wvRef.current as any)?.goForward?.() } catch {} },
    reload: () => { try { (wvRef.current as any)?.reload?.() } catch {} },
    stop: () => { try { (wvRef.current as any)?.stop?.() } catch {} },
    getURL: () => urlRef.current,
    getTitle: () => titleRef.current
  }))

  useEffect(() => {
    const wv: any = wvRef.current
    if (!wv) return

    const onNav = () => {
      try {
        const current = wv.getURL?.() || wv.getAttribute('src') || src
        urlRef.current = current
        onUrlChange?.(current)
      } catch {}
    }
    const onTitle = (e: any) => {
      titleRef.current = e?.title || 'Shy Navigator'
      onTitleChange?.(titleRef.current)
    }
    const onDomReady = async () => {
      try {
        const wc = wv.getWebContents?.()
        const electronAPI = (window as any).electronAPI
        if (wc && electronAPI?.setupWebviewContextMenu) {
          electronAPI.setupWebviewContextMenu(wc.id)
        }
      } catch {}
    }
    const onDownload = (e: any) => {
      try {
        const filename = e?.item?.getFilename?.() || 'download'
        const url = e?.item?.getURL?.() || ''
        const size = e?.item?.getTotalBytes?.() || 0
        onDownload?.(filename, url, size)
      } catch {}
    }

    wv.addEventListener('did-navigate', onNav as any)
    wv.addEventListener('did-navigate-in-page', onNav as any)
    wv.addEventListener('page-title-updated', onTitle as any)
    wv.addEventListener('dom-ready', onDomReady as any)
    wv.addEventListener('will-download', onDownload as any)

    return () => {
      try {
        wv.removeEventListener('did-navigate', onNav as any)
        wv.removeEventListener('did-navigate-in-page', onNav as any)
        wv.removeEventListener('page-title-updated', onTitle as any)
        wv.removeEventListener('dom-ready', onDomReady as any)
        wv.removeEventListener('will-download', onDownload as any)
      } catch {}
    }
  }, [src, onUrlChange, onTitleChange, onDownload])

  // Do not trigger loadURL on src change; <webview src> drives navigation
  return (
    // @ts-ignore custom element in JSX
    <webview
      ref={wvRef as any}
      src={src}
      className={className || ''}
      allowpopups={true}
      nodeintegration={false}
      webpreferences="contextIsolation=true,nodeIntegration=false,nodeIntegrationInWorker=false,nodeIntegrationInSubFrames=false,sandbox=true,spellcheck=true,enableWebSQL=false"
      useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
    />
  )
})

export default BrowserView
