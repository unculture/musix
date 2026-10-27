// The typed bridge exposed to the renderer as `window.musix`.
import type { Project, ProjectSummary } from './project'

export interface ModelSettings {
  /** Text + structured output (composer, lyric helper). */
  text: string
  /** Speech-to-text (audio input). */
  transcribe: string
  /** Music generation (audio output). */
  music: string
  /** Cover pictures (image output). */
  image: string
  /** Natural read-aloud voice (audio output). */
  voice: string
}

export const DEFAULT_MODELS: ModelSettings = {
  text: 'google/gemini-3.5-flash',
  transcribe: 'google/gemini-3.5-flash',
  music: 'google/lyria-3-pro-preview',
  image: 'google/gemini-3.1-flash-image',
  voice: 'openai/gpt-audio-mini'
}

/** Voices the parent can choose for read-aloud. */
export const VOICES = [
  { id: 'marin', label: 'Marin' },
  { id: 'coral', label: 'Coral' },
  { id: 'shimmer', label: 'Shimmer' },
  { id: 'sage', label: 'Sage' },
  { id: 'cedar', label: 'Cedar' }
] as const

export interface VoiceSettings {
  /** Use the natural AI voice (falls back to the computer's voice when offline). */
  natural: boolean
  name: string
}

export const DEFAULT_VOICE: VoiceSettings = { natural: true, name: 'marin' }

export interface PublicSettings {
  hasKey: boolean
  /** Where the key came from — the parent settings screen, or an env var during development. */
  keySource: 'stored' | 'env' | 'none'
  models: ModelSettings
  /** Daily cap on AI music tracks, set by the parent. */
  magicPerDay: number
  magicLeft: number
  voice: VoiceSettings
  appVersion: string
}

export interface KeyStatus {
  ok: boolean
  /** Remaining credit in USD, if the key has a limit. */
  remaining?: number | null
  message?: string
}

export type ChatRole = 'system' | 'user' | 'assistant'

export type ChatContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'input_audio'; input_audio: { data: string; format: string } }
    >

export interface ChatMessage {
  role: ChatRole
  content: ChatContent
}

export interface ChatRequest {
  messages: ChatMessage[]
  /** Defaults to the configured text model. */
  model?: string
  temperature?: number
  /** JSON schema for structured output; the reply is parsed and returned as `json`. */
  schema?: { name: string; schema: Record<string, unknown> }
}

export interface ChatResult {
  text: string
  json?: unknown
}

export interface TranscribeRequest {
  /** Base64 audio, without a data: prefix. */
  audio: string
  /** e.g. 'webm', 'wav', 'mp3' */
  format: string
  /** Extra hint, e.g. "These are song lyrics." */
  hint?: string
}

/** Results from main come back as a tagged union so the renderer can show friendly messages. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export interface MusixApi {
  platform: NodeJS.Platform
  versions: { app: string; electron: string }
  updates: {
    /** Called when a new version has downloaded; it installs when the app is closed. */
    onReady(callback: (version: string) => void): () => void
    restartNow(): Promise<void>
  }
  settings: {
    get(): Promise<PublicSettings>
    setKey(key: string | null): Promise<PublicSettings>
    testKey(key?: string): Promise<KeyStatus>
    setModels(models: Partial<ModelSettings>): Promise<PublicSettings>
    setMagicPerDay(n: number): Promise<PublicSettings>
    setVoice(voice: Partial<VoiceSettings>): Promise<PublicSettings>
  }
  media: {
    /** Ask the OS for microphone access (macOS shows a prompt the first time). */
    askMic(): Promise<boolean>
  }
  projects: {
    list(): Promise<ProjectSummary[]>
    load(id: string): Promise<Project>
    save(project: Project): Promise<void>
    delete(id: string): Promise<void>
    duplicate(id: string): Promise<Project>
    writeAudio(id: string, name: string, data: Uint8Array): Promise<string>
    readAudio(id: string, file: string): Promise<Uint8Array>
  }
  files: {
    /** Ask where to save, then write the MP3. Resolves to the saved path, or null if cancelled. */
    saveMp3(data: Uint8Array, suggestedName: string): Promise<string | null>
    showInFolder(path: string): Promise<void>
    /** Save a song as a .musix file. Resolves to the path, or null if cancelled. */
    exportSong(id: string, title: string): Promise<string | null>
    /** Pick a .musix file and add it to My Songs. Resolves to the new song's id. */
    importSong(): Promise<string | null>
    /** Called when a .musix file is opened from outside the app (e.g. double-clicked). */
    onSongImported(callback: () => void): () => void
    /** Ids of songs imported from outside the app since last asked. */
    takeImported(): Promise<string[]>
  }
  ai: {
    chat(req: ChatRequest): Promise<Result<ChatResult>>
    transcribe(req: TranscribeRequest): Promise<Result<string>>
    /** Generate a music track with the music model and save it in the song's audio folder. */
    music(projectId: string, prompt: string): Promise<Result<string>>
    /** Draw a cover picture and save it with the song. Counts towards the daily magic limit. */
    cover(projectId: string, prompt: string): Promise<Result<string>>
    /** Read a line aloud with the natural voice: WAV bytes (cached on disk after the first time). */
    speak(text: string): Promise<Result<Uint8Array>>
  }
}
