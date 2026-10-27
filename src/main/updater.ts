import { app, BrowserWindow, ipcMain } from 'electron'
import electronUpdater from 'electron-updater'

const { autoUpdater } = electronUpdater
const CHECK_EVERY_MS = 4 * 60 * 60 * 1000

// Updates download quietly and install the next time Musix is closed — no scary prompts for a child.
export function startUpdater(): void {
  ipcMain.handle('app:restartToUpdate', () => autoUpdater.quitAndInstall())
  if (!app.isPackaged || process.env['MUSIX_NO_UPDATE']) return
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('update-downloaded', (info) => {
    for (const win of BrowserWindow.getAllWindows())
      win.webContents.send('update-ready', info.version)
  })
  autoUpdater.on('error', (e) => console.error('Update check failed', e))
  const check = (): void => {
    autoUpdater.checkForUpdates().catch((e) => console.error('Update check failed', e))
  }
  check()
  setInterval(check, CHECK_EVERY_MS)
}
