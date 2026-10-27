import type { ChatRequest, ChatResult, KeyStatus, TranscribeRequest } from '@shared/api'

const BASE = 'https://openrouter.ai/api/v1'

export class OpenRouterError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message)
  }
}

function headers(key: string): Record<string, string> {
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://github.com/unculture/musix',
    'X-Title': 'Musix'
  }
}

export function buildChatBody(req: ChatRequest, defaultModel: string): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: req.model ?? defaultModel,
    messages: req.messages
  }
  if (req.temperature !== undefined) body.temperature = req.temperature
  if (req.schema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: { name: req.schema.name, strict: true, schema: req.schema.schema }
    }
  }
  return body
}

export function buildTranscribeRequest(req: TranscribeRequest, model: string): ChatRequest {
  const instructions = [
    'Transcribe exactly what is said in this recording.',
    'The speaker is a child. Keep their words as spoken — do not rewrite, correct grammar or add anything.',
    'Use sensible punctuation and start a new line for each sentence or sung line.',
    'Reply with only the transcription. If nothing is said, reply with an empty string.',
    req.hint ?? ''
  ]
    .filter(Boolean)
    .join(' ')
  return {
    model,
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: instructions },
          { type: 'input_audio', input_audio: { data: req.audio, format: req.format } }
        ]
      }
    ]
  }
}

/** Extract the first JSON object from a reply, tolerating ```json fences. */
export function parseJsonReply(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = (fenced ? fenced[1] : text).trim()
  try {
    return JSON.parse(candidate)
  } catch {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(candidate.slice(start, end + 1))
    throw new OpenRouterError('The reply was not valid JSON')
  }
}

async function post(key: string, path: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: headers(key),
    body: JSON.stringify(body)
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const message = (json.error as { message?: string } | undefined)?.message ?? res.statusText
    throw new OpenRouterError(message, res.status)
  }
  return json
}

export async function chat(
  key: string,
  req: ChatRequest,
  defaultModel: string
): Promise<ChatResult> {
  const json = await post(key, '/chat/completions', buildChatBody(req, defaultModel))
  const choices = json.choices as Array<{ message?: { content?: string } }> | undefined
  const text = choices?.[0]?.message?.content ?? ''
  return req.schema ? { text, json: parseJsonReply(text) } : { text }
}

export async function transcribe(
  key: string,
  req: TranscribeRequest,
  model: string
): Promise<string> {
  const result = await chat(key, buildTranscribeRequest(req, model), model)
  return result.text.trim().replace(/^["']|["']$/g, '')
}

export async function testKey(key: string): Promise<KeyStatus> {
  const res = await fetch(`${BASE}/key`, { headers: headers(key) })
  if (!res.ok)
    return {
      ok: false,
      message: res.status === 401 ? 'That key was not accepted.' : res.statusText
    }
  const { data } = (await res.json()) as { data?: { limit_remaining?: number | null } }
  return { ok: true, remaining: data?.limit_remaining ?? null }
}
