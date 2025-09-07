import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { WebviewTag } from 'electron'
import type { Tab } from '../browser'

type Props = {
  src: string
  className?: string
  tabInstance?: Tab
  onUrlChange?: (url: string) => void
  onTitleChange?: (title: string) => void
  onDownload?: (filename: string, url: string, size: number) => void
}

export type BrowserViewHandle = WebviewTag | null

const BrowserView = forwardRef<BrowserViewHandle, Props>(function BrowserView(
  { src, className, tabInstance, onUrlChange, onTitleChange, onDownload },
  ref
) {
  const wvRef = useRef<WebviewTag | null>(null)

  useImperativeHandle(ref, () => wvRef.current)

  // Connect Tab instance to webview element
  useEffect(() => {
    const wv = wvRef.current
    if (!wv || !tabInstance) return
    tabInstance.setWebviewElement(wv as unknown as HTMLWebViewElement, {
      onNavigation: (url) => onUrlChange?.(url),
      onTitleUpdated: (title) => onTitleChange?.(title),
      onFaviconUpdated: () => {},
      onLoadingState: () => {},
      onDownloadStarted: (filename, url, totalBytes) => onDownload?.(filename, url, totalBytes)
    })
    return () => tabInstance.destroy()
  }, [tabInstance, onUrlChange, onTitleChange, onDownload])

  // Do not trigger loadURL here; <webview src> controls navigation
  return (
    // @ts-ignore
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
