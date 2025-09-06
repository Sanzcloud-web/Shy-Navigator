import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { WebviewTag } from 'electron'

type Props = {
  src: string
  className?: string
  onUrlChange?: (url: string) => void
  onTitleChange?: (title: string) => void
  isDark?: boolean
}

export type BrowserViewHandle = WebviewTag | null

const BrowserView = forwardRef<BrowserViewHandle, Props>(function BrowserView(
  { src, className, onUrlChange, onTitleChange, isDark = false },
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

  // Définir les préférences de thème pour la webview
  useEffect(() => {
    const wv = wvRef.current
    if (!wv) return

    const setThemePreference = () => {
      try {
        // @ts-ignore - Electron runtime method
        const webContents = wv.getWebContents?.()
        if (webContents) {
          // Définir les préférences Chrome pour le dark mode
          webContents.executeJavaScript(`
            // Simuler les préférences media queries
            Object.defineProperty(window, 'matchMedia', {
              writable: true,
              value: function(query) {
                if (query === '(prefers-color-scheme: dark)') {
                  return {
                    matches: ${isDark},
                    media: query,
                    onchange: null,
                    addListener: function() {},
                    removeListener: function() {},
                    addEventListener: function() {},
                    removeEventListener: function() {},
                    dispatchEvent: function() {}
                  };
                }
                return window.matchMedia.originalMatchMedia(query);
              }
            });
            
            // Sauvegarder l'original si pas déjà fait
            if (!window.matchMedia.originalMatchMedia) {
              window.matchMedia.originalMatchMedia = window.matchMedia;
            }

            // Dispatch event pour notifier les sites du changement
            const event = new CustomEvent('themechange', { detail: { isDark: ${isDark} } });
            window.dispatchEvent(event);

            // Forcer le re-check des media queries
            const darkModeEvent = new MediaQueryListEvent('change', {
              matches: ${isDark},
              media: '(prefers-color-scheme: dark)'
            });
            window.dispatchEvent(darkModeEvent);
          `)

          // Définir aussi le CSS color-scheme
          webContents.insertCSS(`
            :root {
              color-scheme: ${isDark ? 'dark' : 'light'};
            }
            
            /* Force certains sites à respecter le thème */
            html {
              color-scheme: ${isDark ? 'dark' : 'light'};
            }
          `)
        }
      } catch (error) {
        console.log('Could not set theme preference:', error)
      }
    }

    // Appliquer lors du chargement de nouvelles pages
    const onDomReady = () => setThemePreference()
    wv.addEventListener('dom-ready', onDomReady as any)
    
    return () => {
      wv.removeEventListener('dom-ready', onDomReady as any)
    }
  }, [isDark])

  return (
    // @ts-ignore - custom element in React
    <webview 
      ref={wvRef as any} 
      src={src} 
      className={className || ''} 
      allowpopups
      style={{ colorScheme: isDark ? 'dark' : 'light' }}
    />
  )
})

export default BrowserView

