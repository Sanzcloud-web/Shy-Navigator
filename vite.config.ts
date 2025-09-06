import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Charger les variables d'environnement
  const env = loadEnv(mode, process.cwd(), '')
  
  console.log('🔧 Vite config - YOUTUBE_API loaded:', !!env.YOUTUBE_API)
  if (env.YOUTUBE_API) {
    console.log('🔧 Key preview:', env.YOUTUBE_API.substring(0, 15) + '...')
  }
  
  return {
    // Important pour Electron en prod: assets relatifs depuis file://
    base: './',
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      strictPort: true
    },
    build: {
      outDir: 'dist'
    },
    define: {
      // Exposer les variables d'environnement au renderer
      'process.env.YOUTUBE_API': JSON.stringify(env.YOUTUBE_API)
    }
  }
})
