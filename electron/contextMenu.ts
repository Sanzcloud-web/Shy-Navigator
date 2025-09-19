import { Menu, MenuItem, WebContents, BrowserWindow, clipboard, shell } from 'electron'

export function setupChromeContextMenu(webContents: WebContents, opts?: { isDev?: boolean }) {
  const isDev = (opts && typeof opts.isDev !== 'undefined')
    ? !!opts.isDev
    : (!!process.env.VITE_DEV_SERVER_URL || process.env.NODE_ENV === 'development')

  webContents.on('context-menu', (_event, params) => {
    const menu = new Menu()

    // Navigation
    try {
      if ((webContents as any).canGoBack?.() || (webContents as any).canGoForward?.()) {
        if ((webContents as any).canGoBack?.()) {
          menu.append(new MenuItem({ label: 'Back', accelerator: 'Alt+Left', click: () => (webContents as any).goBack?.() }))
        }
        if ((webContents as any).canGoForward?.()) {
          menu.append(new MenuItem({ label: 'Forward', accelerator: 'Alt+Right', click: () => (webContents as any).goForward?.() }))
        }
        menu.append(new MenuItem({ label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => webContents.reload() }))
        menu.append(new MenuItem({ type: 'separator' }))
      }
    } catch {}

    // Edit actions
    if (params.editFlags.canCut) {
      menu.append(new MenuItem({ label: 'Cut', accelerator: 'CmdOrCtrl+X', click: () => webContents.cut() }))
    }
    if (params.editFlags.canCopy) {
      menu.append(new MenuItem({ label: 'Copy', accelerator: 'CmdOrCtrl+C', click: () => webContents.copy() }))
    }
    if (params.editFlags.canPaste) {
      menu.append(new MenuItem({ label: 'Paste', accelerator: 'CmdOrCtrl+V', click: () => webContents.paste() }))
    }
    if (params.editFlags.canSelectAll) {
      menu.append(new MenuItem({ type: 'separator' }))
      menu.append(new MenuItem({ label: 'Select All', accelerator: 'CmdOrCtrl+A', click: () => webContents.selectAll() }))
    }

    // Link actions
    if (params.linkURL) {
      menu.append(new MenuItem({ type: 'separator' }))
      menu.append(new MenuItem({
        label: 'Open Link in New Tab',
        click: () => shell.openExternal(params.linkURL)
      }))
      menu.append(new MenuItem({
        label: 'Copy Link Address',
        click: () => clipboard.writeText(params.linkURL)
      }))
    }

    // Image actions
    if (params.mediaType === 'image' && params.srcURL) {
      menu.append(new MenuItem({ type: 'separator' }))
      menu.append(new MenuItem({ label: 'Copy Image', click: () => webContents.copyImageAt(params.x, params.y) }))
      menu.append(new MenuItem({ label: 'Copy Image Address', click: () => clipboard.writeText(params.srcURL) }))
    }

    // Search selected text
    if (params.selectionText) {
      menu.append(new MenuItem({ type: 'separator' }))
      menu.append(new MenuItem({
        label: `Search Google for "${params.selectionText.substring(0, 20)}${params.selectionText.length > 20 ? '...' : ''}"`,
        click: () => shell.openExternal(`https://www.google.com/search?q=${encodeURIComponent(params.selectionText)}`)
      }))
    }

    // Inspect element in development
    if (isDev) {
      menu.append(new MenuItem({ type: 'separator' }))
      menu.append(new MenuItem({ label: 'Inspect Element', click: () => webContents.inspectElement(params.x, params.y) }))
    }

    if (menu.items.length > 0) {
      const win = BrowserWindow.fromWebContents(webContents)
      menu.popup({ window: win || undefined })
    }
  })
}
