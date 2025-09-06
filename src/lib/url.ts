export function normalizeUrl(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return 'https://www.google.com'
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  // If it looks like a domain or contains a dot, assume URL
  if (/^\w+[\w.-]*\.[a-z]{2,}(?:\/.*)?$/i.test(trimmed)) return `https://${trimmed}`
  // Otherwise, search on Google
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`
}

