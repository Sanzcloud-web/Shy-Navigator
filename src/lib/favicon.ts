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