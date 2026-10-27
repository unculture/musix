import { describe, expect, it } from 'vitest'
import type { LyricSection } from '../project'
import { fallbackPlan } from './composer'
import {
  addInstrumental,
  addNote,
  deleteNote,
  melodyRows,
  resizeNote,
  shiftNote,
  stepNote,
  chordChoices,
  deleteSection,
  duplicateSection,
  moveSection,
  setChord,
  setTempo,
  transpose,
  transposeChord,
  transposeLimits
} from './edit'

const lyrics: LyricSection[] = [
  { id: 'v1', kind: 'verse', lines: [{ id: 'a', text: 'The stars are shining over my town' }] },
  { id: 'c1', kind: 'chorus', lines: [{ id: 'c', text: 'Shine shine shine' }] }
]
const plan = fallbackPlan({ lyrics, style: { preset: 'pop', description: '', speed: 3 } })

describe('edits', () => {
  it('clamps tempo', () => {
    expect(setTempo(plan, 400).bpm).toBe(180)
    expect(setTempo(plan, 10).bpm).toBe(60)
  })

  it('transposes chords, key and melody together', () => {
    expect(transposeChord('Am7', 2)).toBe('Bm7')
    expect(transposeChord('C/G', -1)).toBe('B/F#')
    const up = transpose(plan, 2)
    expect(up.sections[1].melody[0].pitch).toBe(plan.sections[1].melody[0].pitch + 2)
    expect(up.sections[1].chords[0].symbol).toBe(
      transposeChord(plan.sections[1].chords[0].symbol, 2)
    )
    const { up: maxUp, down: maxDown } = transposeLimits(plan)
    expect(maxUp).toBeGreaterThanOrEqual(0)
    expect(maxDown).toBeGreaterThanOrEqual(0)
  })

  it('moves, copies and removes sections', () => {
    const ids = plan.sections.map((s) => s.id)
    expect(moveSection(plan, 0, 1).sections.map((s) => s.id)).toEqual([
      ids[1],
      ids[0],
      ...ids.slice(2)
    ])
    const dup = duplicateSection(plan, 1)
    expect(dup.sections).toHaveLength(plan.sections.length + 1)
    expect(dup.sections[2].id).not.toBe(dup.sections[1].id)
    expect(dup.sections[2].melody).toEqual(dup.sections[1].melody)
    expect(deleteSection(plan, 0).sections).toHaveLength(plan.sections.length - 1)
  })

  it('changes chords only to real chords', () => {
    expect(setChord(plan, 1, 0, 'F').sections[1].chords[0].symbol).toBe('F')
    expect(setChord(plan, 1, 0, 'Q').sections[1].chords[0].symbol).toBe(
      plan.sections[1].chords[0].symbol
    )
  })

  it('offers chords from the key and adds instrumentals', () => {
    expect(chordChoices({ ...plan, key: 'C', scale: 'major' })).toEqual([
      'C',
      'Dm',
      'Em',
      'F',
      'G',
      'Am'
    ])
    const more = addInstrumental(plan, 2)
    expect(more.sections[2].melody).toEqual([])
    expect(more.sections[2].chords).toHaveLength(4)
  })
})

describe('melody edits', () => {
  const si = plan.sections.findIndex((s) => s.melody.length > 1)
  const first = plan.sections[si].melody[0]

  it('steps notes through the scale only', () => {
    const rows = melodyRows(plan)
    const up = stepNote(plan, si, 0, 1).sections[si].melody[0]
    expect(rows.indexOf(up.pitch)).toBe(rows.indexOf(first.pitch) + 1)
  })

  it('moves, resizes, adds and deletes within the section', () => {
    const beats = plan.sections[si].bars * 4
    expect(shiftNote(plan, si, 0, -10).sections[si].melody[0].start).toBe(0)
    expect(resizeNote(plan, si, 0, -5).sections[si].melody[0].duration).toBe(0.5)
    const added = addNote(plan, si, beats - 0.5, melodyRows(plan)[3], 4).sections[si].melody
    expect(added.at(-1)!.duration).toBe(0.5)
    expect(deleteNote(plan, si, 0).sections[si].melody).toHaveLength(
      plan.sections[si].melody.length - 1
    )
  })
})
