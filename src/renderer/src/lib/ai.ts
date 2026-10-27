import type { ChatRequest, ChatResult, Result, TranscribeRequest } from '@shared/api'
import { toast } from '@/state/toast'

// Turn technical failures into something an 11-year-old can act on. Returns null on failure.
function friendly<T>(result: Result<T>): T | null {
  if (result.ok) return result.value
  if (result.error === 'MAGIC_LIMIT') {
    toast('The magic band is tired out for today. You can still change your own band!', '😴')
  } else if (result.error === 'NO_KEY') {
    toast('The music robot needs a grown-up to switch it on in Settings ⚙️', '🔌')
  } else if (/credit|402|limit/i.test(result.error)) {
    toast('The music robot is out of energy. Ask a grown-up to top it up.', '🔋')
  } else if (/fetch|network|ENOTFOUND|internet/i.test(result.error)) {
    toast("I can't reach the internet right now. Let's try again in a moment.", '📡')
  } else {
    toast('Hmm, the music robot got muddled. Shall we try again?', '🤖')
  }
  return null
}

export async function aiChat(req: ChatRequest): Promise<ChatResult | null> {
  return friendly(await window.musix.ai.chat(req))
}

export async function aiTranscribe(req: TranscribeRequest): Promise<string | null> {
  return friendly(await window.musix.ai.transcribe(req))
}

export async function aiMusic(projectId: string, prompt: string): Promise<string | null> {
  return friendly(await window.musix.ai.music(projectId, prompt))
}
