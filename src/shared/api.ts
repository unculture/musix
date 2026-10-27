// The typed bridge exposed to the renderer as `window.musix`.

export interface ModelSettings {
  /** Text + structured output (composer, lyric helper). */
  text: string
  /** Speech-to-text (audio input). */
  transcribe: string
  /** Music generation (audio output). */
  music: string
}

export const DEFAULT_MODELS: ModelSettings = {
  text: 'google/gemini-3.5-flash',
  transcribe: 'google/gemini-3.5-flash',
  music: 'google/lyria-3-pro-preview'
}

export interface PublicSettings {
  hasKey: boolean
  /** Where the key came from — the parent settings screen, or an env var during development. */
  keySource: 'stored' | 'env' | 'none'
  models: ModelSettings
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
  settings: {
    get(): Promise<PublicSettings>
    setKey(key: string | null): Promise<PublicSettings>
    testKey(key?: string): Promise<KeyStatus>
    setModels(models: Partial<ModelSettings>): Promise<PublicSettings>
  }
  ai: {
    chat(req: ChatRequest): Promise<Result<ChatResult>>
    transcribe(req: TranscribeRequest): Promise<Result<string>>
  }
}
