/**
 * Récupère l'URL du favicon d'un site web
 */
export function getFaviconUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname
    
    // Utilise l'API Google pour récupérer les favicons
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  } catch {
    // Fallback pour les URLs malformées
    return ''
  }
}

/**
 * Extrait le nom de domaine d'une URL pour l'affichage
 */
export function getDomainName(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return url.replace(/^https?:\/\//, '').replace('www.', '')
  }
}