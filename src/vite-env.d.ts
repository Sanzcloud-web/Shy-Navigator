/// <reference types="vite/client" />

// Types pour les variables d'environnement
declare namespace NodeJS {
  interface ProcessEnv {
    readonly YOUTUBE_API: string
  }
}