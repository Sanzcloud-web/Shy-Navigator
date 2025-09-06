/**
 * Récupère l'URL du favicon d'un site web
 */
export function getFaviconUrl(url: string): string {
  console.log('🔍 getFaviconUrl called with:', url)
  
  if (!url || url.trim() === '' || url === 'about:blank') {
    console.log('❌ Empty or blank URL, returning empty string')
    return ''
  }
  
  try {
    // S'assurer que l'URL a un protocole
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`
    const urlObj = new URL(normalizedUrl)
    const domain = urlObj.hostname
    
    console.log('🌐 Extracted domain:', domain)
    
    if (!domain || domain === 'localhost') {
      console.log('❌ Invalid or localhost domain, returning empty string')
      return ''
    }
    
    // Utilise l'API Google pour récupérer les favicons
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    console.log('✅ Generated favicon URL:', faviconUrl)
    return faviconUrl
  } catch (error) {
    // Fallback pour les URLs malformées
    console.log('❌ Error parsing URL:', error)
    return ''
  }
}

/**
 * Génère l'URL de recherche pour un site donné
 */
export function getSiteSearchUrl(siteUrl: string, query: string): string {
  try {
    const urlObj = new URL(siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`)
    const domain = urlObj.hostname.toLowerCase()
    
    const encodedQuery = encodeURIComponent(query)
    
    // Mapping des sites populaires vers leurs URLs de recherche
    const searchMappings: Record<string, string> = {
      'www.youtube.com': `https://www.youtube.com/results?search_query=${encodedQuery}`,
      'youtube.com': `https://www.youtube.com/results?search_query=${encodedQuery}`,
      'www.google.com': `https://www.google.com/search?q=${encodedQuery}`,
      'google.com': `https://www.google.com/search?q=${encodedQuery}`,
      'www.github.com': `https://github.com/search?q=${encodedQuery}`,
      'github.com': `https://github.com/search?q=${encodedQuery}`,
      'www.wikipedia.org': `https://www.wikipedia.org/search-redirect.php?search=${encodedQuery}`,
      'wikipedia.org': `https://www.wikipedia.org/search-redirect.php?search=${encodedQuery}`,
      'www.amazon.com': `https://www.amazon.com/s?k=${encodedQuery}`,
      'amazon.com': `https://www.amazon.com/s?k=${encodedQuery}`,
      'www.reddit.com': `https://www.reddit.com/search?q=${encodedQuery}`,
      'reddit.com': `https://www.reddit.com/search?q=${encodedQuery}`,
      'www.twitter.com': `https://twitter.com/search?q=${encodedQuery}`,
      'twitter.com': `https://twitter.com/search?q=${encodedQuery}`,
      'x.com': `https://x.com/search?q=${encodedQuery}`,
      'www.stackoverflow.com': `https://stackoverflow.com/search?q=${encodedQuery}`,
      'stackoverflow.com': `https://stackoverflow.com/search?q=${encodedQuery}`
    }
    
    return searchMappings[domain] || `${siteUrl}?q=${encodedQuery}`
  } catch {
    return `${siteUrl}?q=${encodeURIComponent(query)}`
  }
}

/**
 * Vérifie si un site supporte la recherche directe
 */
export function supportsSiteSearch(siteUrl: string): boolean {
  try {
    const urlObj = new URL(siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`)
    const domain = urlObj.hostname.toLowerCase()
    
    const supportedSites = [
      'www.youtube.com', 'youtube.com',
      'www.google.com', 'google.com', 
      'www.github.com', 'github.com',
      'www.wikipedia.org', 'wikipedia.org',
      'www.amazon.com', 'amazon.com',
      'www.reddit.com', 'reddit.com',
      'www.twitter.com', 'twitter.com', 'x.com',
      'www.stackoverflow.com', 'stackoverflow.com'
    ]
    
    return supportedSites.includes(domain)
  } catch {
    return false
  }
}

/**
 * Extrait le nom de domaine d'une URL pour l'affichage
 */
export function getDomainName(url: string): string {
  if (!url || url.trim() === '' || url === 'about:blank') {
    return 'New Tab'
  }
  
  try {
    // S'assurer que l'URL a un protocole
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`
    const urlObj = new URL(normalizedUrl)
    return urlObj.hostname.replace('www.', '') || 'New Tab'
  } catch {
    // Nettoyer l'URL pour l'affichage
    return url.replace(/^https?:\/\//, '').replace('www.', '').split('/')[0] || 'New Tab'
  }
}