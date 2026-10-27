import { ipcMain } from 'electron'
import type { ChatRequest, ModelSettings, Result, TranscribeRequest } from '@shared/api'
import * as openrouter from './openrouter'
import { getApiKey, getModels, getPublicSettings, setApiKey, setModels } from './settings'

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

export function registerIpc(): void {
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

  ipcMain.handle('ai:chat', (_e, req: ChatRequest) =>
    wrap(() => openrouter.chat(requireKey(), req, getModels().text))
  )
  ipcMain.handle('ai:transcribe', (_e, req: TranscribeRequest) =>
    wrap(() => openrouter.transcribe(requireKey(), req, getModels().transcribe))
  )
}
