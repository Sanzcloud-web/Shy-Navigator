import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system')
  const [isDark, setIsDark] = useState(false)

  // Détecter le thème système
  const getSystemTheme = () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  // Calculer si on doit être en mode sombre
  const calculateIsDark = (currentTheme: Theme) => {
    if (currentTheme === 'system') {
      return getSystemTheme() === 'dark'
    }
    return currentTheme === 'dark'
  }

  useEffect(() => {
    // Charger le thème sauvegardé
    const savedTheme = localStorage.getItem('theme') as Theme || 'system'
    setTheme(savedTheme)
    setIsDark(calculateIsDark(savedTheme))

    // Écouter les changements du thème système
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        setIsDark(mediaQuery.matches)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  useEffect(() => {
    // Appliquer le thème au document
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  const setThemeMode = (newTheme: Theme) => {
    setTheme(newTheme)
    setIsDark(calculateIsDark(newTheme))
    localStorage.setItem('theme', newTheme)
  }

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark'
    setThemeMode(newTheme)
  }

  return {
    theme,
    isDark,
    setTheme: setThemeMode,
    toggleTheme
  }
}