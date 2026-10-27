import { describe, expect, it } from 'vitest'
import type { LyricSection, Project } from '../project'
import {
  composerMessages,
  composerSchema,
  fallbackPlan,
  normaliseAiPlan,
  type AiPlan
} from './composer'
import { inScale, VOICE_HIGH, VOICE_LOW } from './theory'

const section = (id: string, kind: LyricSection['kind'], text: string): LyricSection => ({
  id,
  kind,
  lines: text.split('\n').map((t, i) => ({ id: `${id}-${i}`, text: t }))
})

const project: Pick<Project, 'lyrics' | 'style' | 'title'> = {
  title: 'My new song',
  lyrics: [
    section(
      'v1',
      'verse',
      'The stars are shining over my town\nI dance all night and I never come down'
    ),
    section('c1', 'chorus', 'Shine shine shine\nEverybody shine'),
    section('v2', 'verse', 'Morning comes and the sky turns blue\nI keep on dancing just for you')
  ],
  style: { preset: 'pop', description: '', mood: 'happy', speed: 3 }
}

describe('fallbackPlan', () => {
  const plan = fallbackPlan(project)

  it('sings every section and ends on a chorus', () => {
    const sung = plan.sections.map((s) => s.lyricSectionId).filter(Boolean)
    expect(sung).toEqual(['v1', 'c1', 'v2', 'c1'])
    expect(plan.sections[0].kind).toBe('intro')
    expect(plan.sections.at(-1)!.kind).toBe('outro')
  })

  it('writes melodies in the key, in a child-friendly range, inside their section', () => {
    for (const s of plan.sections) {
      for (const n of s.melody) {
        expect(inScale(n.pitch, plan.key, plan.scale)).toBe(true)
        expect(n.pitch).toBeGreaterThanOrEqual(VOICE_LOW)
        expect(n.pitch).toBeLessThanOrEqual(VOICE_HIGH)
        expect(n.start + n.duration).toBeLessThanOrEqual(s.bars * 4)
      }
      expect(s.chords).toHaveLength(s.bars)
    }
  })

  it('is deterministic', () => {
    const again = fallbackPlan(project)
    expect(again.key).toBe(plan.key)
    expect(again.sections.map((s) => s.chords)).toEqual(plan.sections.map((s) => s.chords))
  })
})

describe('normaliseAiPlan', () => {
  it('repairs a messy AI answer', () => {
    const ai: AiPlan = {
      title: 'Shine!',
      bpm: 400,
      key: 'G',
      scale: 'major',
      drumStyle: 'made-up',
      instruments: {
        drums: 'pop-kit',
        bass: 'kazoo',
        chords: 'piano',
        pad: 'warm-pad',
        melody: 'flute'
      },
      sections: [
        {
          kind: 'chorus',
          lyricSectionId: 'c1',
          bars: 1,
          energy: 9,
          chords: ['G', 'Xyz'],
          lines: [
            {
              lineId: 'c1-0',
              notes: [
                { syllable: 'Shine', pitch: 'G#4', beats: 6 },
                { syllable: 'shine', pitch: 'A6', beats: 6 },
                { syllable: 'rest', pitch: 'rest', beats: 1 }
              ]
            }
          ]
        }
      ]
    }
    const { plan, title } = normaliseAiPlan(ai, project)
    expect(title).toBe('Shine!')
    expect(plan.bpm).toBe(180)
    expect(plan.drumStyle).toBe('pop')
    expect(plan.parts.find((p) => p.role === 'bass')!.instrument).toBe('synth-bass')
    expect(plan.parts.find((p) => p.role === 'melody')!.instrument).toBe('flute')

    const chorus = plan.sections.find((s) => s.lyricSectionId === 'c1')!
    expect(chorus.bars).toBe(4)
    expect(chorus.energy).toBe(5)
    expect(chorus.chords.every((c) => c.symbol !== 'Xyz')).toBe(true)
    // Line 1 squashed into its 8-beat slot; line 2 had no AI notes so got a fallback tune.
    const line1 = chorus.melody.filter((n) => n.start < 8)
    expect(line1.at(-1)!.start + line1.at(-1)!.duration).toBeLessThanOrEqual(8)
    expect(chorus.melody.some((n) => n.start >= 8)).toBe(true)
    for (const n of chorus.melody) expect(inScale(n.pitch, 'G', 'major')).toBe(true)

    // Missing verses were added back, plus intro and outro.
    const sung = new Set(plan.sections.map((s) => s.lyricSectionId))
    expect(sung.has('v1') && sung.has('v2')).toBe(true)
    expect(plan.sections[0].kind).toBe('intro')
    expect(plan.sections.at(-1)!.kind).toBe('outro')
  })
})

describe('composer prompt', () => {
  it('includes line ids and a strict schema', () => {
    const msgs = composerMessages(project)
    expect(msgs[1].content).toContain('lineId=c1-0')
    expect(JSON.stringify(composerSchema())).toContain('"additionalProperties":false')
  })
})

describe('held notes', () => {
  it("merges '~' on the same pitch into the previous note", () => {
    const ai = {
      title: '',
      bpm: 100,
      key: 'C',
      scale: 'major',
      drumStyle: 'pop',
      instruments: {
        drums: 'pop-kit',
        bass: 'synth-bass',
        chords: 'piano',
        pad: 'warm-pad',
        melody: 'flute'
      },
      sections: [
        {
          kind: 'chorus',
          lyricSectionId: 'c1',
          bars: 4,
          energy: 5,
          chords: ['C', 'F', 'G', 'C'],
          lines: [
            {
              lineId: 'c1-0',
              notes: [
                { syllable: 'Shine', pitch: 'G4', beats: 1 },
                { syllable: '~', pitch: 'G4', beats: 1 },
                { syllable: 'shine', pitch: 'A4', beats: 2 }
              ]
            }
          ]
        }
      ]
    } as AiPlan
    const chorus = normaliseAiPlan(ai, project).plan.sections.find(
      (s) => s.lyricSectionId === 'c1'
    )!
    const line = chorus.melody.filter((n) => n.start < 8)
    expect(line.map((n) => n.syllable)).toEqual(['Shine', 'shine'])
    expect(line[0].duration).toBeCloseTo(1.95)
  })
})
