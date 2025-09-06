import { useEffect, useRef, useState } from 'react'
import type { WebviewTag } from 'electron'

function normalizeUrl(input: string) {
  const trimmed = input.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^\w+\.[\w.-]+\/.*/.test(trimmed) || /\.[a-z]{2,}$/i.test(trimmed)) return `https://${trimmed}`
  return `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`
}

export default function App() {
  const [address, setAddress] = useState('https://duckduckgo.com')
  const [title, setTitle] = useState('Shy Navigator')
  const webviewRef = useRef<WebviewTag | null>(null)

  const navigate = (url: string) => {
    const u = normalizeUrl(url)
    setAddress(u)
    const wv = webviewRef.current
    if (wv) {
      try {
        // @ts-ignore Electron runtime provides this method
        wv.loadURL?.(u)
      } catch {
        wv.src = u
      }
    }
  }

  useEffect(() => {
    const wv = webviewRef.current
    if (!wv) return
    const onNav = () => {
      // @ts-ignore Electron provides getURL
      const current = (wv as any).getURL?.() || wv.getAttribute('src') || address
      setAddress(current)
    }
    const onTitle = (e: any) => {
      setTitle(e.title || 'Shy Navigator')
    }
    // Common webview events
    wv.addEventListener('did-navigate-in-page', onNav as any)
    wv.addEventListener('did-navigate', onNav as any)
    wv.addEventListener('page-title-updated', onTitle as any)
    return () => {
      wv.removeEventListener('did-navigate-in-page', onNav as any)
      wv.removeEventListener('did-navigate', onNav as any)
      wv.removeEventListener('page-title-updated', onTitle as any)
    }
  }, [])

  return (
    <div className="h-full w-full bg-neutral-900 text-neutral-100">
      <div className="h-12 w-full border-b border-neutral-800 flex items-center gap-2 px-2">
        <button
          className="px-2 py-1 rounded hover:bg-neutral-800"
          onClick={() => (webviewRef.current as any)?.goBack?.()}
          title="Back"
        >⟵</button>
        <button
          className="px-2 py-1 rounded hover:bg-neutral-800"
          onClick={() => (webviewRef.current as any)?.goForward?.()}
          title="Forward"
        >⟶</button>
        <button
          className="px-2 py-1 rounded hover:bg-neutral-800"
          onClick={() => (webviewRef.current as any)?.reload?.()}
          title="Reload"
        >⟲</button>
        <input
          className="flex-1 bg-neutral-800 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') navigate(address)
          }}
          placeholder="Tape une URL ou une recherche…"
        />
        <button
          className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500"
          onClick={() => navigate(address)}
        >Aller</button>
        <div className="ml-2 text-sm text-neutral-400 truncate" title={title}>{title}</div>
      </div>
      <div className="w-full" style={{ height: 'calc(100vh - 3rem)' }}>
        {/* Enable preload API access as needed; allowpopups for OAuth flows */}
        {/* @ts-ignore - Electron webview tag */}
        <webview
          ref={webviewRef as any}
          src={address}
          className="w-full h-full"
          allowpopups
        />
      </div>
    </div>
  )
}

