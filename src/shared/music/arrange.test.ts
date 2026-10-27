import { describe, expect, it } from 'vitest'
import type { LyricSection } from '../project'
import { arrange, karaokeTimeline } from './arrange'
import { fallbackPlan } from './composer'

const lyrics: LyricSection[] = [
  {
    id: 'v1',
    kind: 'verse',
    lines: [
      { id: 'a', text: 'The stars are shining over my town' },
      { id: 'b', text: 'I dance all night' }
    ]
  },
  {
    id: 'c1',
    kind: 'chorus',
    lines: [
      { id: 'c', text: 'Shine shine shine' },
      { id: 'd', text: 'Everybody shine' }
    ]
  }
]

describe('arrange', () => {
  for (const preset of ['pop', 'rock', 'disco', 'hiphop', 'lullaby', 'jazz', 'reggae', 'movie']) {
    it(`arranges a ${preset} song`, () => {
      const plan = fallbackPlan({ lyrics, style: { preset, description: '', speed: 3 } })
      const { events, sections, totalBeats } = arrange(plan)
      expect(totalBeats).toBe(plan.sections.reduce((t, s) => t + s.bars * 4, 0))
      expect(sections).toHaveLength(plan.sections.length)
      expect(events.length).toBeGreaterThan(50)
      for (const e of events) {
        expect(e.time).toBeGreaterThanOrEqual(0)
        expect(e.time).toBeLessThan(totalBeats + 0.5)
        if (e.role !== 'drums') expect(e.pitches.length).toBeGreaterThan(0)
      }
      const roles = new Set(events.map((e) => e.role))
      expect(roles.has('melody') && roles.has('chords') && roles.has('bass')).toBe(true)
      expect(roles.has('drums')).toBe(preset !== 'lullaby')
    })
  }

  it('keeps quiet sections quiet', () => {
    const plan = fallbackPlan({ lyrics, style: { preset: 'pop', description: '', speed: 3 } })
    plan.sections[0].energy = 1
    const { events, sections } = arrange(plan)
    const intro = events.filter((e) => e.time < sections[0].beats)
    expect(intro.some((e) => e.role === 'drums' || e.role === 'bass')).toBe(false)
  })
})

describe('karaokeTimeline', () => {
  it('times every sung line in order', () => {
    const plan = fallbackPlan({ lyrics, style: { preset: 'pop', description: '', speed: 3 } })
    const lines = karaokeTimeline(plan, lyrics)
    expect(lines.map((l) => l.text)).toEqual([
      'The stars are shining over my town',
      'I dance all night',
      'Shine shine shine',
      'Everybody shine'
    ])
    for (let i = 1; i < lines.length; i++)
      expect(lines[i].start).toBeGreaterThan(lines[i - 1].start)
    for (const l of lines) {
      expect(l.words.length).toBe(l.text.split(' ').length)
      for (let i = 1; i < l.words.length; i++)
        expect(l.words[i].start).toBeGreaterThanOrEqual(l.words[i - 1].start)
    }
  })
})
