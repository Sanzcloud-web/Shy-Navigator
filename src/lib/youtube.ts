export interface YouTubeVideo {
  id: string
  title: string
  channelTitle: string
  channelId: string
  publishedAt: string
  description: string
  thumbnails: {
    default: { url: string; width: number; height: number }
    medium: { url: string; width: number; height: number }
    high: { url: string; width: number; height: number }
  }
  duration?: string
  viewCount?: string
  likeCount?: string
}

export interface YouTubeSearchResponse {
  videos: YouTubeVideo[]
  nextPageToken?: string
}

class YouTubeService {
  private apiKey: string
  private baseUrl = 'https://www.googleapis.com/youtube/v3'

  constructor() {
    // Récupérer la clé API depuis les variables d'environnement
    this.apiKey = process.env.YOUTUBE_API || ''
    
    console.log('🔑 YouTube API Key check:', {
      processEnv: process.env.YOUTUBE_API,
      processEnvExists: !!process.env.YOUTUBE_API,
      hasKey: !!this.apiKey,
      keyLength: this.apiKey.length,
      keyPreview: this.apiKey ? `${this.apiKey.substring(0, 15)}...` : 'NO KEY'
    })
    
    if (!this.apiKey) {
      console.warn('❌ Clé API YouTube non trouvée. Vérifiez YOUTUBE_API dans .env')
      console.warn('💡 Assurez-vous que le fichier .env est à la racine du projet')
      console.warn('💡 Format: YOUTUBE_API=votre_cle_ici')
    } else {
      console.log('✅ Clé API YouTube trouvée, longueur:', this.apiKey.length)
    }
  }

  async searchVideos(query: string, maxResults: number = 6): Promise<YouTubeSearchResponse> {
    console.log('🚀 searchVideos appelé:', { query, maxResults, hasApiKey: !!this.apiKey })
    
    if (!this.apiKey) {
      console.error('❌ Pas de clé API - arrêt de la recherche')
      throw new Error('Clé API YouTube manquante')
    }

    try {
      console.log('🔍 Début recherche YouTube:', query)

      // 1. Recherche des vidéos
      const searchUrl = `${this.baseUrl}/search?` + new URLSearchParams({
        key: this.apiKey,
        q: query,
        part: 'snippet',
        type: 'video',
        maxResults: maxResults.toString(),
        order: 'relevance',
        safeSearch: 'moderate'
      })

      console.log('📡 URL de recherche:', searchUrl.replace(this.apiKey, 'API_KEY_HIDDEN'))

      const searchResponse = await fetch(searchUrl)
      
      console.log('📥 Réponse API search:', {
        status: searchResponse.status,
        statusText: searchResponse.statusText,
        ok: searchResponse.ok
      })
      
      if (!searchResponse.ok) {
        const errorText = await searchResponse.text()
        console.error('❌ Erreur API response:', errorText)
        throw new Error(`Erreur API YouTube: ${searchResponse.status} - ${errorText}`)
      }

      const searchData = await searchResponse.json()
      console.log('📊 Données reçues:', {
        totalResults: searchData.pageInfo?.totalResults,
        itemsCount: searchData.items?.length,
        items: searchData.items
      })
      
      if (!searchData.items || searchData.items.length === 0) {
        console.log('📭 Aucune vidéo trouvée pour:', query)
        return { videos: [] }
      }

      // 2. Récupérer les détails des vidéos (durée, vues, etc.)
      const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',')
      
      const detailsUrl = `${this.baseUrl}/videos?` + new URLSearchParams({
        key: this.apiKey,
        id: videoIds,
        part: 'contentDetails,statistics'
      })

      const detailsResponse = await fetch(detailsUrl)
      const detailsData = await detailsResponse.json()

      // 3. Combiner les données
      const videos: YouTubeVideo[] = searchData.items.map((item: any) => {
        const details = detailsData.items?.find((d: any) => d.id === item.id.videoId)
        
        return {
          id: item.id.videoId,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          channelId: item.snippet.channelId,
          publishedAt: item.snippet.publishedAt,
          description: item.snippet.description,
          thumbnails: {
            default: item.snippet.thumbnails.default,
            medium: item.snippet.thumbnails.medium,
            high: item.snippet.thumbnails.high
          },
          duration: details?.contentDetails?.duration,
          viewCount: details?.statistics?.viewCount,
          likeCount: details?.statistics?.likeCount
        }
      })

      console.log('✅ Trouvé', videos.length, 'vidéos YouTube')
      return {
        videos,
        nextPageToken: searchData.nextPageToken
      }

    } catch (error) {
      console.error('❌ Erreur lors de la recherche YouTube:', error)
      throw error
    }
  }

  /**
   * Formate la durée ISO 8601 en format lisible (ex: PT4M13S → 4:13)
   */
  formatDuration(isoDuration: string): string {
    if (!isoDuration) return ''
    
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return ''

    const hours = parseInt(match[1] || '0')
    const minutes = parseInt(match[2] || '0')
    const seconds = parseInt(match[3] || '0')

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
  }

  /**
   * Formate le nombre de vues (ex: 1234567 → 1,2M)
   */
  formatViewCount(viewCount: string): string {
    if (!viewCount) return ''
    
    const count = parseInt(viewCount)
    
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1).replace('.0', '')}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1).replace('.0', '')}K`
    } else {
      return count.toString()
    }
  }

  /**
   * Formate la date de publication (ex: 2023-12-01 → il y a 2 mois)
   */
  formatPublishedAt(publishedAt: string): string {
    if (!publishedAt) return ''
    
    const now = new Date()
    const published = new Date(publishedAt)
    const diffMs = now.getTime() - published.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return "aujourd'hui"
    } else if (diffDays === 1) {
      return 'hier'
    } else if (diffDays < 7) {
      return `il y a ${diffDays} jours`
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7)
      return `il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `il y a ${months} mois`
    } else {
      const years = Math.floor(diffDays / 365)
      return `il y a ${years} an${years > 1 ? 's' : ''}`
    }
  }

  /**
   * Génère l'URL de la vidéo YouTube
   */
  getVideoUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`
  }
}

export const youtubeService = new YouTubeService()