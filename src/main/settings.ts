import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  DEFAULT_MODELS,
  DEFAULT_VOICE,
  VOICES,
  type ModelSettings,
  type PublicSettings,
  type VoiceSettings
} from '@shared/api'

interface StoredSettings {
  /** OpenRouter key, encrypted with safeStorage and base64-encoded. */
  encryptedKey?: string
  models?: Partial<ModelSettings>
  /** Parent's cap on AI music tracks per day (they cost real money). */
  magicPerDay?: number
  magicUsed?: { date: string; count: number }
  voice?: Partial<VoiceSettings>
}

export const DEFAULT_MAGIC_PER_DAY = 10
const today = (): string => new Date().toISOString().slice(0, 10)

const file = (): string => join(app.getPath('userData'), 'settings.json')

function read(): StoredSettings {
  try {
    return existsSync(file()) ? (JSON.parse(readFileSync(file(), 'utf8')) as StoredSettings) : {}
  } catch {
    return {}
  }
}

function write(settings: StoredSettings): void {
  mkdirSync(dirname(file()), { recursive: true })
  writeFileSync(file(), JSON.stringify(settings, null, 2))
}

function storedKey(): string | null {
  const { encryptedKey } = read()
  if (!encryptedKey || !safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(Buffer.from(encryptedKey, 'base64'))
  } catch {
    return null
  }
}

/** The key never leaves the main process. During development OPENROUTER_API_KEY can stand in. */
export function getApiKey(): string | null {
  return storedKey() ?? process.env['OPENROUTER_API_KEY'] ?? null
}

export function getModels(): ModelSettings {
  return { ...DEFAULT_MODELS, ...read().models }
}

export function getPublicSettings(): PublicSettings {
  const stored = storedKey()
  const env = process.env['OPENROUTER_API_KEY']
  return {
    hasKey: Boolean(stored ?? env),
    keySource: stored ? 'stored' : env ? 'env' : 'none',
    models: getModels(),
    magicPerDay: read().magicPerDay ?? DEFAULT_MAGIC_PER_DAY,
    magicLeft: magicLeft(),
    voice: getVoice(),
    appVersion: app.getVersion()
  }
}

export function setApiKey(key: string | null): void {
  const settings = read()
  if (key && key.trim()) {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure storage is not available')
    settings.encryptedKey = safeStorage.encryptString(key.trim()).toString('base64')
  } else {
    delete settings.encryptedKey
  }
  write(settings)
}

export function setModels(models: Partial<ModelSettings>): void {
  const settings = read()
  const cleaned = Object.fromEntries(
    Object.entries(models).filter(([, v]) => typeof v === 'string' && v.trim())
  )
  settings.models = { ...settings.models, ...cleaned }
  write(settings)
}

export function magicLeft(): number {
  const s = read()
  const used = s.magicUsed?.date === today() ? s.magicUsed.count : 0
  return Math.max(0, (s.magicPerDay ?? DEFAULT_MAGIC_PER_DAY) - used)
}

export function recordMagicUse(): void {
  const s = read()
  const count = s.magicUsed?.date === today() ? s.magicUsed.count : 0
  write({ ...s, magicUsed: { date: today(), count: count + 1 } })
}

export function setMagicPerDay(n: number): void {
  write({ ...read(), magicPerDay: Math.max(0, Math.min(100, Math.round(n))) })
}

export function getVoice(): VoiceSettings {
  return { ...DEFAULT_VOICE, ...read().voice }
}

export function setVoice(voice: Partial<VoiceSettings>): void {
  const next = { ...getVoice(), ...voice }
  if (!VOICES.some((v) => v.id === next.name)) next.name = DEFAULT_VOICE.name
  write({ ...read(), voice: { natural: Boolean(next.natural), name: next.name } })
}
