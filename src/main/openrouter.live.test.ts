import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DEFAULT_MODELS } from '@shared/api'
import { transcribe } from './openrouter'

// Live checks against OpenRouter. Only run when a key and sample are provided, e.g.
//   OPENROUTER_API_KEY=… MUSIX_LIVE_AUDIO=/path/to/speech.wav npx vitest run live
const key = process.env['OPENROUTER_API_KEY']
const audio = process.env['MUSIX_LIVE_AUDIO']

describe.skipIf(!key || !audio)('OpenRouter (live)', () => {
  it('transcribes speech', async () => {
    const format = audio!.split('.').pop()!
    const text = await transcribe(
      key!,
      { audio: readFileSync(audio!).toString('base64'), format, hint: 'These are song lyrics.' },
      DEFAULT_MODELS.transcribe
    )
    console.log(`[${format}]`, text)
    expect(text.toLowerCase()).toContain('stars')
  }, 60_000)
})
