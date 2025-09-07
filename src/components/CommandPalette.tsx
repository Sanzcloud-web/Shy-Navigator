import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Play } from 'lucide-react'
import type { Tab } from './Sidebar'
import { getDomainName, getFaviconUrl, getSiteSearchUrl, supportsSiteSearch } from '../lib/favicon'
import { youtubeService, type YouTubeVideo } from '../lib/youtube'

type Props = {
  open: boolean
  onClose: () => void
  tabs: Tab[]
  onSelectTab: (id: string) => void
  onSearch: (query: string) => void
}

type GoogleSuggestion = {
  text: string
  type: 'suggestion'
}

type YouTubeVideoItem = YouTubeVideo & {
  type: 'youtube-video'
}

// Type guards to narrow union types safely
function isSuggestion(item: any): item is GoogleSuggestion {
  return !!item && (item as any).type === 'suggestion'
}

function isYouTubeVideoItem(item: any): item is YouTubeVideoItem {
  return !!item && (item as any).type === 'youtube-video'
}

export default function CommandPalette({ open, onClose, tabs, onSelectTab, onSearch }: Props) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const [suggestions, setSuggestions] = useState<GoogleSuggestion[]>([])
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [siteSearchMode, setSiteSearchMode] = useState<{ url: string; siteName: string } | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setIndex(0)
      setSuggestions([])
      setYoutubeVideos([])
      setSiteSearchMode(null)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  // Fetch YouTube videos when in YouTube search mode
  useEffect(() => {
    console.log('🎬 YouTube effect triggered:', {
      siteSearchMode,
      query: query.trim(),
      queryLength: query.length,
      shouldFetch: !!(siteSearchMode && query.trim() && query.length >= 2 && siteSearchMode.url.includes('youtube.com'))
    })
    
    if (!siteSearchMode || !query.trim() || query.length < 2) {
      console.log('❌ Pas de recherche YouTube - conditions non remplies')
      setYoutubeVideos([])
      return
    }

    if (siteSearchMode.url.includes('youtube.com')) {
      console.log('✅ Mode YouTube détecté - lancement recherche')
      const controller = new AbortController()
      
      const fetchYouTubeVideos = async () => {
        try {
          setLoading(true)
          console.log('🎥 Début fetch vidéos YouTube:', query)
          
          const response = await youtubeService.searchVideos(query, 8)
          
          console.log('📹 Réponse YouTube reçue:', response)
          
          if (!controller.signal.aborted) {
            const videoItems: YouTubeVideoItem[] = response.videos.map(video => ({
              ...video,
              type: 'youtube-video' as const
            }))
            
            console.log('✅ Vidéos formatées:', videoItems.length)
            setYoutubeVideos(videoItems)
          }
        } catch (error) {
          if (!controller.signal.aborted) {
            console.error('❌ Erreur recherche YouTube:', error)
            setYoutubeVideos([])
          }
        } finally {
          if (!controller.signal.aborted) {
            setLoading(false)
          }
        }
      }

      const timeoutId = setTimeout(fetchYouTubeVideos, 300) // Debounce

      return () => {
        clearTimeout(timeoutId)
        controller.abort()
      }
    } else {
      console.log('❌ Pas YouTube - URL:', siteSearchMode.url)
    }
  }, [siteSearchMode, query])

  // Fetch Google suggestions
  useEffect(() => {
    if (!query.trim() || query.length < 2 || siteSearchMode) {
      setSuggestions([])
      if (!siteSearchMode) setLoading(false)
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    const fetchSuggestions = async () => {
      setLoading(true)
      try {
        // Using Google's suggest API (JSONP)
        const script = document.createElement('script')
        const callbackName = `googleSuggestions${Date.now()}`
        
        // Define callback
        ;(window as any)[callbackName] = (data: any) => {
          if (!controller.signal.aborted && data && data[1]) {
            const googleSuggestions: GoogleSuggestion[] = data[1]
              .slice(0, 6) // Limit to 6 suggestions
              .map((suggestion: string) => ({
                text: suggestion,
                type: 'suggestion' as const
              }))
            setSuggestions(googleSuggestions)
          }
          setLoading(false)
          document.body.removeChild(script)
          delete (window as any)[callbackName]
        }

        script.src = `https://suggestqueries.google.com/complete/search?client=chrome&callback=${callbackName}&q=${encodeURIComponent(query)}`
        document.body.appendChild(script)

        // Cleanup timeout
        setTimeout(() => {
          if (document.body.contains(script)) {
            document.body.removeChild(script)
            delete (window as any)[callbackName]
            setLoading(false)
          }
        }, 5000)

      } catch (error) {
        if (!controller.signal.aborted) {
          setLoading(false)
          setSuggestions([])
        }
      }
    }

    const timeoutId = setTimeout(fetchSuggestions, 200) // Debounce

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [query])

  const filtered = useMemo(() => {
    if (!query) return tabs
    const q = query.toLowerCase()
    return tabs.filter(t => (t.title || t.url).toLowerCase().includes(q))
  }, [query, tabs])

  const allItems = useMemo(() => {
    const items: Array<Tab | GoogleSuggestion | YouTubeVideoItem> = [...filtered]
    
    if (siteSearchMode && siteSearchMode.url.includes('youtube.com') && youtubeVideos.length > 0) {
      // En mode recherche YouTube, afficher les vidéos
      items.push(...youtubeVideos)
    } else if (query.trim() && suggestions.length > 0) {
      // Mode recherche normal, afficher les suggestions Google
      items.push(...suggestions)
    }
    
    return items
  }, [filtered, suggestions, youtubeVideos, siteSearchMode, query])

  // Scroll automatique pour suivre la sélection
  useEffect(() => {
    if (!containerRef.current || !open) return
    
    const selectedElement = containerRef.current.children[index] as HTMLElement
    if (!selectedElement) return
    
    const container = containerRef.current
    const containerRect = container.getBoundingClientRect()
    const elementRect = selectedElement.getBoundingClientRect()
    
    const isAbove = elementRect.top < containerRect.top
    const isBelow = elementRect.bottom > containerRect.bottom
    
    if (isAbove || isBelow) {
      selectedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      })
    }
  }, [index, open, allItems.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return
      
      const currentItems: Array<Tab | GoogleSuggestion | YouTubeVideoItem> = [...filtered]
      if (siteSearchMode && siteSearchMode.url.includes('youtube.com') && youtubeVideos.length > 0) {
        currentItems.push(...youtubeVideos)
      } else if (query.trim() && suggestions.length > 0) {
        currentItems.push(...suggestions)
      }
      
      if (e.key === 'Escape') { 
        e.preventDefault()
        if (siteSearchMode) {
          setSiteSearchMode(null)
          setQuery('')
        } else {
          onClose()
        }
      }
      if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(i + 1, currentItems.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(i - 1, 0)) }
      if (e.key === 'Tab') {
        e.preventDefault()
        const selectedItem = currentItems[index]
        if (isSuggestion(selectedItem)) {
          const isUrl = selectedItem.text.startsWith('http://') || selectedItem.text.startsWith('https://')
          if (isUrl && supportsSiteSearch(selectedItem.text)) {
            setSiteSearchMode({
              url: selectedItem.text,
              siteName: getDomainName(selectedItem.text)
            })
            setQuery('')
            setIndex(0)
            return
          }
        }
      }
      if (e.key === 'Enter') {
        e.preventDefault()

        // Respecter l'élément sélectionné en priorité (ex: vidéo YouTube)
        const selectedItem = currentItems[index]
        if (selectedItem) {
          if (isYouTubeVideoItem(selectedItem)) {
            // Ouvrir directement la vidéo sélectionnée
            onSearch(youtubeService.getVideoUrl(selectedItem.id))
            onClose()
            return
          } else if (isSuggestion(selectedItem)) {
            onSearch(selectedItem.text)
            onClose()
            return
          } else if ('id' in selectedItem) {
            onSelectTab(selectedItem.id)
            onClose()
            return
          }
        }

        // Si aucun élément spécifique sélectionné, gérer les modes de recherche
        if (siteSearchMode && query.trim()) {
          // Recherche sur le site (YouTube, Google, etc.)
          const searchUrl = getSiteSearchUrl(siteSearchMode.url, query)
          onSearch(searchUrl)
          onClose()
          return
        }

        // Sinon, recherche générique
        if (query.trim()) {
          onSearch(query)
        }
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, query, index, onSearch, onSelectTab, onClose, filtered, suggestions, youtubeVideos, siteSearchMode])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[640px] max-w-[90vw] bg-white dark:bg-[#1F1F1F] text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-[#2A2A2A] rounded-[20px] shadow-[0_16px_40px_rgba(0,0,0,0.08)]" onMouseDown={(e) => e.stopPropagation()}>
        <div className="p-4">
          {siteSearchMode ? (
            <div className="flex items-center gap-3 mb-3">
              <img 
                src={getFaviconUrl(siteSearchMode.url)} 
                alt="" 
                className="w-6 h-6 rounded-sm"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Recherche sur <span className="font-medium">{siteSearchMode.siteName}</span>
              </span>
            </div>
          ) : null}
          <input
            ref={inputRef}
            className="w-full bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-full px-5 py-3 outline-none text-[18px]"
            placeholder={siteSearchMode ? `Rechercher sur ${siteSearchMode.siteName}…` : "Rechercher ou entrer une URL…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div ref={containerRef} className="max-h-[50vh] overflow-y-auto p-3">
          {allItems.map((item, i) => {
            console.log('🎯 Rendering item:', item)
            
            if ('type' in item && item.type === 'youtube-video') {
              // Affichage des vidéos YouTube
              const video = item as YouTubeVideoItem
              return (
                <div
                  key={`youtube-${video.id}`}
                  className={`p-3 rounded-xl cursor-pointer ${i === index ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => { onSearch(youtubeService.getVideoUrl(video.id)); onClose() }}
                >
                  <div className="flex gap-3">
                    {/* Miniature vidéo */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={video.thumbnails.medium.url}
                        alt={video.title}
                        className="w-28 h-16 object-cover rounded-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = video.thumbnails.default.url
                        }}
                      />
                      {video.duration && (
                        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                          {youtubeService.formatDuration(video.duration)}
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-6 h-6 text-white/80" fill="currentColor" />
                      </div>
                    </div>

                    {/* Informations vidéo */}
                    <div className="min-w-0 flex-1">
                      <div 
                        className="font-medium text-sm leading-tight mb-1 overflow-hidden"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}
                      >
                        {video.title}
                      </div>
                      <div className="text-xs opacity-70 mb-1">
                        {video.channelTitle}
                      </div>
                      <div className="text-xs opacity-60 flex items-center gap-2">
                        {video.viewCount && (
                          <span>{youtubeService.formatViewCount(video.viewCount)} vues</span>
                        )}
                        {video.publishedAt && (
                          <>
                            <span>•</span>
                            <span>{youtubeService.formatPublishedAt(video.publishedAt)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            } else if ('type' in item && item.type === 'suggestion') {
              // Détecter si la suggestion est une URL complète
              const isUrl = item.text.startsWith('http://') || item.text.startsWith('https://')
              
              if (isUrl) {
                // Afficher comme un site avec favicon
                const favicon = getFaviconUrl(item.text)
                const domainName = getDomainName(item.text)
                const supportsSearch = supportsSiteSearch(item.text)
                
                return (
                  <div
                    key={`suggestion-${i}`}
                    className={`px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between ${i === index ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
                    onMouseEnter={() => setIndex(i)}
                    onClick={() => { onSearch(item.text); onClose() }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-6 h-6 rounded-sm flex-shrink-0 relative">
                        {favicon ? (
                          <img 
                            src={favicon} 
                            alt="" 
                            className="w-full h-full rounded-sm"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              const parent = target.parentElement!
                              target.style.display = 'none'
                              parent.innerHTML = '<div class="w-full h-full bg-neutral-200 rounded-sm flex items-center justify-center text-xs">🌐</div>'
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-neutral-200 rounded-sm flex items-center justify-center text-xs">
                            🌐
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-medium">
                          {domainName}
                        </div>
                        <div className="truncate text-xs opacity-70">
                          {item.text}
                        </div>
                      </div>
                    </div>
                    <div className="opacity-70 text-sm ml-4 flex-shrink-0 flex items-center gap-2">
                      {supportsSearch && i === index && (
                        <span className="text-xs px-2 py-1 bg-white/20 rounded">Tab pour rechercher</span>
                      )}
                      <span>Ouvrir →</span>
                    </div>
                  </div>
                )
              } else {
                // Afficher comme une recherche normale
                return (
                  <div
                    key={`suggestion-${i}`}
                    className={`px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between ${i === index ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
                    onMouseEnter={() => setIndex(i)}
                    onClick={() => { onSearch(item.text); onClose() }}
                  >
                    <div className="flex items-center gap-3">
                      <Search className="w-4 h-4 text-neutral-500 dark:text-neutral-400 flex-shrink-0" />
                      <div className="truncate text-[15px]">{item.text}</div>
                    </div>
                    <div className="opacity-70 text-sm ml-4">Rechercher →</div>
                  </div>
                )
              }
            } else {
              const tab = item as Tab
              console.log('📑 Rendering tab:', tab.title, 'favicon:', tab.favicon)
              return (
                <div
                  key={tab.id}
                  className={`px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between ${i === index ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => { onSelectTab(tab.id); onClose() }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-6 h-6 rounded-sm flex-shrink-0 relative">
                      {tab.favicon ? (
                        <img 
                          src={tab.favicon} 
                          alt="" 
                          className="w-full h-full rounded-sm"
                          onError={(e) => {
                            // Remplacer par l'icône par défaut si l'image ne charge pas
                            const target = e.target as HTMLImageElement
                            const parent = target.parentElement!
                            target.style.display = 'none'
                            parent.innerHTML = '<div class="w-full h-full bg-neutral-200 rounded-sm flex items-center justify-center text-xs">🌐</div>'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-200 rounded-sm flex items-center justify-center text-xs">
                          🌐
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-medium">
                        {tab.title || getDomainName(tab.url)}
                      </div>
                      {tab.title && tab.title !== getDomainName(tab.url) && (
                        <div className="truncate text-xs opacity-70">
                          {getDomainName(tab.url)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="opacity-70 text-sm ml-4 flex-shrink-0">Switch to Tab →</div>
                </div>
              )
            }
          })}
          {allItems.length === 0 && query.trim() && (
            <div className="text-neutral-500 dark:text-neutral-400 text-sm px-3 py-4">
              {loading ? 'Chargement des suggestions...' : 'Aucun résultat. Appuie sur Entrée pour rechercher avec Google.'}
            </div>
          )}
          {allItems.length === 0 && !query.trim() && (
            <div className="text-neutral-500 dark:text-neutral-400 text-sm px-3 py-4">Commence à taper pour voir les suggestions...</div>
          )}
        </div>
      </div>
    </div>
  )
}
