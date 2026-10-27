import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { writeFileSync } from 'node:fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { importFile } from './archive'
import { queueImported, registerIpc } from './ipc'
import { handleProtocol, registerSchemes } from './protocol'
import { startUpdater } from './updater'

registerSchemes()

// Dev aid: MUSIX_FAKE_MIC=1 uses Chromium's test microphone (a beeping tone) for automated checks.
if (process.env['MUSIX_FAKE_MIC']) {
  app.commandLine.appendSwitch('use-fake-device-for-media-stream')
  app.commandLine.appendSwitch('use-fake-ui-for-media-stream')
}

// Opening .musix files from Finder / Explorer: import straight away, then let the window know.
// The renderer also collects anything imported before it was ready (see files:takeImported).
const musixArg = (argv: string[]): string[] =>
  argv.filter((a) => a.toLowerCase().endsWith('.musix'))

async function openSongFiles(paths: string[]): Promise<void> {
  if (!paths.length) return
  await app.whenReady()
  for (const path of paths) {
    try {
      queueImported((await importFile(path)).id)
    } catch (e) {
      console.error('Could not open', path, e)
    }
  }
  const win = BrowserWindow.getAllWindows()[0]
  if (!win) return
  win.webContents.send('song-imported')
  if (win.isMinimized()) win.restore()
  win.focus()
}

if (!app.requestSingleInstanceLock() && !process.env['MUSIX_SCREENSHOT']) {
  app.quit()
}
app.on('second-instance', (_e, argv) => openSongFiles(musixArg(argv)))
app.on('open-file', (e, path) => {
  e.preventDefault()
  openSongFiles([path])
})
openSongFiles(musixArg(process.argv.slice(1)))

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
  startUpdater()
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
