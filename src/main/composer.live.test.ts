import { describe, expect, it } from 'vitest'
import { DEFAULT_MODELS } from '@shared/api'
import { chat } from './openrouter'
import {
  composerMessages,
  composerSchema,
  normaliseAiPlan,
  type AiPlan
} from '@shared/music/composer'
import { midiToNote } from '@shared/music/theory'

// Live check of the AI composer: OPENROUTER_API_KEY=… npx vitest run composer.live
const key = process.env['OPENROUTER_API_KEY']

describe.skipIf(!key)('AI composer (live)', () => {
  it('writes a usable plan', async () => {
    const project = {
      title: 'My new song',
      lyrics: [
        {
          id: 'v1',
          kind: 'verse' as const,
          lines: [
            { id: 'a', text: 'The stars are shining over my town' },
            { id: 'b', text: 'I dance all night and I never come down' }
          ]
        },
        {
          id: 'c1',
          kind: 'chorus' as const,
          lines: [
            { id: 'c', text: 'Shine shine shine' },
            { id: 'd', text: 'Everybody shine' }
          ]
        }
      ],
      style: { preset: 'disco', description: '', mood: 'happy' as const, speed: 4 }
    }
    const started = Date.now()
    const res = await chat(
      key!,
      {
        messages: composerMessages(project),
        schema: { name: 'song_plan', schema: composerSchema() },
        temperature: 0.8
      },
      DEFAULT_MODELS.text
    )
    const { plan, title } = normaliseAiPlan(res.json as AiPlan, project)
    console.log(
      `${(Date.now() - started) / 1000}s`,
      title,
      plan.bpm,
      plan.key,
      plan.scale,
      plan.drumStyle
    )
    for (const s of plan.sections) {
      console.log(
        s.kind,
        s.bars,
        s.chords.map((c) => c.symbol).join(' '),
        '|',
        s.melody.map((n) => `${n.syllable}:${midiToNote(n.pitch)}@${n.start}`).join(' ')
      )
    }
    expect(plan.sections.some((s) => s.lyricSectionId === 'c1')).toBe(true)
  }, 120_000)
})
