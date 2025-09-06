# Shy Navigator

Navigateur custom minimal basé sur Electron + React + TypeScript + Tailwind. Utilise Vite pour le renderer et TypeScript pour le process principal. Fourni avec Docker/Compose pour le build et le dev.

## Prérequis (hors Docker)

- Node.js >= 18

## Scripts NPM

- `npm run dev` — lance Vite (renderer), le build TS du main en watch, puis ouvre Electron (sur l’hôte).
- `npm run build` — build production: `dist` (renderer) + `dist-electron` (main/preload).
- `npm start` — lance l’app Electron depuis `dist-electron/main.js` (après `build`).

## Docker (dev)

Commande de build (exemple) :

```bash
docker compose -f docker-compose.dev.yml build --no-cache
``)

Commande de run (dev: Vite + build TS en watch) :

```bash
docker compose -f docker-compose.dev.yml up
```

Cette commande n’ouvre pas la fenêtre Electron sur macOS/Windows car l’UI ne peut pas s’afficher directement depuis un conteneur. Deux options :

1) Lancer Electron sur l’hôte en parallèle (recommandé sur macOS/Windows) :

```bash
npm run dev:electron:host
```

2) Sur Linux avec X11, vous pouvez lancer Electron depuis le conteneur via le profil `linux-gui` (nécessite un serveur X actif et les volumes X11) :

```bash
docker compose -f docker-compose.dev.yml --profile linux-gui up electron-linux
```

## Détails techniques

- Renderer: Vite + React + Tailwind.
- Processus principal: TypeScript compilé en CommonJS dans `dist-electron`.
- Le renderer charge un `<webview>` (Chromium) avec barre d’adresse, back/forward/reload.

