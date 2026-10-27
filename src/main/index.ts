import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { writeFileSync } from 'node:fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpc } from './ipc'
import { handleProtocol, registerSchemes } from './protocol'

registerSchemes()

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 680,
    show: false,
    title: 'Musix',
    backgroundColor: '#FFF8EC',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false
    }
  })

  win.on('ready-to-show', () => win.show())
  // No pinch-zoom on touch screens; the layout is already big.
  win.webContents.setVisualZoomLevelLimits(1, 1)

  // Dev aid: MUSIX_SCREENSHOT=out.png captures the window after load, then quits.
  const shot = process.env['MUSIX_SCREENSHOT']
  if (shot) {
    win.webContents.on('console-message', (e) =>
      console.log('[renderer]', (e as unknown as { message: string }).message)
    )
    win.webContents.on('did-finish-load', async () => {
      if (process.env['MUSIX_SCREENSHOT_JS']) {
        await win.webContents.executeJavaScript(process.env['MUSIX_SCREENSHOT_JS'])
      }
      await new Promise((r) => setTimeout(r, 1500))
      writeFileSync(shot, (await win.webContents.capturePage()).toPNG())
      app.quit()
    })
  }
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.unculture.musix')
  registerIpc()
  handleProtocol()
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
