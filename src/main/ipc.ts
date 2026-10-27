import { app, BrowserWindow, dialog, ipcMain, shell, systemPreferences } from 'electron'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ChatRequest, ModelSettings, Result, TranscribeRequest } from '@shared/api'
import type { Project } from '@shared/project'
import * as openrouter from './openrouter'
import * as projects from './projects'
import { exportProject, importFile } from './archive'
import {
  getApiKey,
  getModels,
  getPublicSettings,
  magicLeft,
  setApiKey,
  setMagicPerDay,
  setModels,
  recordMagicUse
} from './settings'

async function wrap<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await fn() }
  } catch (e) {
    console.error(e)
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

function requireKey(): string {
  const key = getApiKey()
  if (!key) throw new Error('NO_KEY')
  return key
}

const imported: string[] = []
export const queueImported = (id: string): void => {
  imported.push(id)
}

export function registerIpc(): void {
  ipcMain.handle('files:takeImported', () => imported.splice(0))
  ipcMain.handle('settings:get', () => getPublicSettings())
  ipcMain.handle('settings:setKey', (_e, key: string | null) => {
    setApiKey(key)
    return getPublicSettings()
  })
  ipcMain.handle('settings:testKey', async (_e, key?: string) => {
    const k = key?.trim() || getApiKey()
    if (!k) return { ok: false, message: 'No key yet.' }
    try {
      return await openrouter.testKey(k)
    } catch {
      return { ok: false, message: 'Could not reach OpenRouter. Is the internet on?' }
    }
  })
  ipcMain.handle('settings:setModels', (_e, models: Partial<ModelSettings>) => {
    setModels(models)
    return getPublicSettings()
  })

  ipcMain.handle('settings:setMagicPerDay', (_e, n: number) => {
    setMagicPerDay(n)
    return getPublicSettings()
  })
  ipcMain.handle('ai:music', (_e, projectId: string, prompt: string) =>
    wrap(async () => {
      const key = requireKey()
      if (magicLeft() <= 0) throw new Error('MAGIC_LIMIT')
      const mp3 = await openrouter.generateMusic(key, prompt, getModels().music)
      recordMagicUse()
      return projects.writeAudio(projectId, `magic-${Date.now()}.mp3`, mp3)
    })
  )
  ipcMain.handle('ai:cover', (_e, projectId: string, prompt: string) =>
    wrap(async () => {
      const key = requireKey()
      if (magicLeft() <= 0) throw new Error('MAGIC_LIMIT')
      const image = await openrouter.generateImage(key, prompt, getModels().image)
      recordMagicUse()
      return projects.writeAudio(projectId, `cover-${Date.now()}.png`, image)
    })
  )
  ipcMain.handle('ai:chat', (_e, req: ChatRequest) =>
    wrap(() => openrouter.chat(requireKey(), req, getModels().text))
  )
  ipcMain.handle('ai:transcribe', (_e, req: TranscribeRequest) =>
    wrap(() => openrouter.transcribe(requireKey(), req, getModels().transcribe))
  )

  ipcMain.handle('media:askMic', async () => {
    if (process.platform !== 'darwin' || process.env['MUSIX_FAKE_MIC']) return true
    if (systemPreferences.getMediaAccessStatus('microphone') === 'granted') return true
    return systemPreferences.askForMediaAccess('microphone')
  })
  ipcMain.handle('projects:list', () => projects.listProjects())
  ipcMain.handle('projects:load', (_e, id: string) => projects.loadProject(id))
  ipcMain.handle('projects:save', (_e, project: Project) => projects.saveProject(project))
  ipcMain.handle('projects:delete', (_e, id: string) => projects.deleteProject(id))
  ipcMain.handle('projects:duplicate', (_e, id: string) => projects.duplicateProject(id))
  ipcMain.handle('projects:writeAudio', (_e, id: string, name: string, data: Uint8Array) =>
    projects.writeAudio(id, name, data)
  )
  ipcMain.handle('projects:readAudio', (_e, id: string, file: string) =>
    projects.readAudio(id, file)
  )

  ipcMain.handle('files:saveMp3', async (e, data: Uint8Array, suggestedName: string) => {
    const safe = suggestedName.replace(/[\\/:*?"<>|]+/g, '').trim() || 'My song'
    // Dev aid for automated checks: skip the dialog.
    const forced = process.env['MUSIX_EXPORT_PATH']
    if (forced) {
      await writeFile(forced, data)
      return forced
    }
    const win = BrowserWindow.fromWebContents(e.sender)
    const options = {
      title: 'Save your song',
      defaultPath: join(app.getPath('music'), `${safe}.mp3`),
      filters: [{ name: 'MP3 audio', extensions: ['mp3'] }]
    }
    const { canceled, filePath } = win
      ? await dialog.showSaveDialog(win, options)
      : await dialog.showSaveDialog(options)
    if (canceled || !filePath) return null
    await writeFile(filePath, data)
    return filePath
  })
  ipcMain.handle('files:showInFolder', (_e, path: string) => shell.showItemInFolder(path))

  ipcMain.handle('files:exportSong', async (e, id: string, title: string) => {
    const safe = title.replace(/[\\/:*?"<>|]+/g, '').trim() || 'My song'
    const win = BrowserWindow.fromWebContents(e.sender)
    const options = {
      title: 'Save a copy of your song',
      defaultPath: join(app.getPath('documents'), `${safe}.musix`),
      filters: [{ name: 'Musix song', extensions: ['musix'] }]
    }
    const { canceled, filePath } = win
      ? await dialog.showSaveDialog(win, options)
      : await dialog.showSaveDialog(options)
    if (canceled || !filePath) return null
    await exportProject(id, filePath)
    return filePath
  })
  ipcMain.handle('files:importSong', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const options = {
      title: 'Open a song',
      filters: [{ name: 'Musix song', extensions: ['musix'] }],
      properties: ['openFile' as const]
    }
    const { canceled, filePaths } = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (canceled || !filePaths[0]) return null
    return (await importFile(filePaths[0])).id
  })
}
