import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
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
  }
})
