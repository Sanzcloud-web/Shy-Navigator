# Shy Navigator

Shy Navigator is an experimental desktop web browser shell built with Electron and a modern React renderer. It mixes a minimal chrome with a command palette, tab sidebar, download log and a lightweight context menu, making it a handy playground for iterating on browser-inspired UX ideas.

## Feature highlights

- **Electron desktop shell** with a frameless window, custom title bar and accelerators managed in the main process.
- **React renderer** that manages tabs in-memory, renders a collapsible sidebar, and drives an `<webview>` element for navigation.
- **Command palette** (⌘/Ctrl + T) for quickly opening tabs and toggling layout options.
- **History & downloads overlay** for reviewing recent navigation without leaving the current page.
- **Light/dark theming** handled in the renderer with Tailwind CSS utilities and persisted via a custom hook.
- **Secure preload bridge** exposing a restricted API (`window.shy` / `window.electronSecure`) for events such as downloads and accelerator callbacks.

## Tech stack

| Area | Stack |
| --- | --- |
| Desktop runtime | [Electron 30](https://www.electronjs.org/) with a TypeScript main process (`electron/main.ts`) compiled to CommonJS in `dist-electron`. The main process wires the browser window, menu/accelerators, downloads and context menu integration (`electron-context-menu`). |
| Renderer | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/), routed with `react-router-dom` and styled with [Tailwind CSS](https://tailwindcss.com/). Animations rely on [Framer Motion](https://www.framer.com/motion/) and icons come from `lucide-react`. Vite is used during development and for production bundling. |
| Tooling | [Vite 5](https://vitejs.dev/) dev server, `tsc` for compiling the Electron process, `concurrently` + `wait-on` for orchestrating scripts, and optional Docker Compose setup for containerised development. |

## Prerequisites (without Docker)

- Node.js **18 or newer** (the project uses Electron 30 which requires a recent Node/npm toolchain).
- npm (bundled with Node.js) for installing dependencies and running the scripts.
- macOS, Windows or Linux with a desktop environment for launching Electron locally.

## Getting started locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/<your-org>/Shy-Navigator.git
   cd Shy-Navigator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development environment**
   ```bash
   npm run dev
   ```
   This command runs three tasks concurrently:
   - `npm run dev:renderer` starts the Vite dev server for the React renderer (default port `5173`).
   - `npm run dev:ts` compiles the Electron main/preload TypeScript in watch mode and outputs to `dist-electron`.
   - `npm run dev:electron:host` waits for Vite and launches Electron pointing at the dev server.

   Whenever you change renderer or Electron files they are recompiled, and the Electron window reloads automatically.

4. **Build for production**
   ```bash
   npm run build
   ```
   The command clears `dist/` and `dist-electron/`, compiles the TypeScript main/preload bundle and produces a minified renderer build. Afterwards you can launch the packaged app with:
   ```bash
   npm run start:nobuild
   ```
   or run `npm start` to build and launch in a single step.

## Running with Docker

A Docker Compose configuration is provided to simplify onboarding, especially on Linux where containerised GUIs are easier to bridge.

1. **Build the development images** (optional after the first run):
   ```bash
   docker compose -f docker-compose.dev.yml build --no-cache
   ```

2. **Start the development stack**:
   ```bash
   docker compose -f docker-compose.dev.yml up
   ```
   This runs the Vite dev server and Electron TypeScript compiler inside the container. The Electron window itself is not launched from the container on macOS/Windows due to display isolation. Use one of the following options:

   - **Preferred (macOS/Windows):** keep the Compose stack running and start Electron on the host machine:
     ```bash
     npm run dev:electron:host
     ```
     This reuses the artifacts produced in the container (`dist-electron/`).

   - **Linux desktop with X11:** enable the Compose profile that mounts your X11 socket and runs Electron inside the container:
     ```bash
     docker compose -f docker-compose.dev.yml --profile linux-gui up electron-linux
     ```
     Ensure an X server is running and that your user is allowed to connect (`xhost +local:` may be required).

Stop the stack at any time with `Ctrl+C` followed by `docker compose ... down`.

## Project structure

```
.
├── electron/              # Main, preload and browser process TypeScript sources
│   ├── main.ts            # Creates the BrowserWindow and registers shortcuts/download handlers
│   ├── preload.ts         # Exposes a limited API to the renderer through context isolation
│   └── browser/           # Helpers for session/webContents behaviour (context menu, downloads, etc.)
├── src/                   # React renderer (Vite entry, components, hooks and pages)
│   ├── App.tsx            # Router and top-level layout for the browser UI
│   ├── components/        # Sidebar, command palette, context menu, webview wrapper…
│   ├── browser/           # Utilities specific to the embedded webview experience
│   └── main.tsx           # Renderer bootstrap executed by Vite
├── docker-compose.dev.yml # Containerised dev workflow definition
├── Dockerfile.dev         # Base image used by the dev compose services
├── vite.config.ts         # Vite configuration for the renderer bundle
└── tailwind.config.ts     # Tailwind theme and file scanning configuration
```

## Useful npm scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Launches renderer dev server, TypeScript watch and Electron host instance. |
| `npm run dev:renderer` | Starts only the Vite dev server for the renderer. |
| `npm run dev:ts` | Watches and compiles the Electron main/preload TypeScript to `dist-electron`. |
| `npm run dev:electron` | Runs Electron after the dev build has been generated inside a container or another process. |
| `npm run build` | Produces production builds for both renderer (`dist/`) and Electron (`dist-electron/`). |
| `npm start` | Builds and launches the production bundle with Electron. |
| `npm run start:nobuild` | Launches Electron using the existing build output. |
| `npm run lint` | Placeholder script (no linter configured yet). |

## Troubleshooting tips

- If Electron fails to start during development, verify that port `5173` is free and that `npm run dev:ts` has emitted `dist-electron/main.js`.
- When running inside Docker on Linux, ensure your user has permission to access `/tmp/.X11-unix` and that the `DISPLAY` environment variable is forwarded.
- Delete the `dist/` and `dist-electron/` directories if you suspect stale artifacts after dependency upgrades.

## License

This project currently does not declare an explicit license. Review your organisation's policies before distributing builds.
