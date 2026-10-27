import { describe, expect, it } from 'vitest'
import {
  chordPitches,
  countSyllables,
  diatonicChord,
  fitToVoice,
  lineSyllables,
  midiToNote,
  noteToMidi,
  parseChord,
  snapToScale
} from './theory'

describe('theory', () => {
  it('converts note names and MIDI', () => {
    expect(noteToMidi('C4')).toBe(60)
    expect(noteToMidi('Bb3')).toBe(58)
    expect(noteToMidi('rest')).toBeNull()
    expect(midiToNote(61)).toBe('C#4')
  })

  it('parses chords', () => {
    expect(parseChord('Am')).toEqual({ root: 9, intervals: [0, 3, 7] })
    expect(parseChord('G7')?.intervals).toEqual([0, 4, 7, 10])
    expect(parseChord('F#dim')?.root).toBe(6)
    expect(parseChord('C/G')?.root).toBe(0)
    expect(parseChord('H')).toBeNull()
  })

  it('builds diatonic chords', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((d) => diatonicChord('C', 'major', d))).toEqual([
      'C',
      'Dm',
      'Em',
      'F',
      'G',
      'Am',
      'Bdim'
    ])
    expect([0, 2, 5, 6].map((d) => diatonicChord('A', 'minor', d))).toEqual(['Am', 'C', 'F', 'G'])
  })

  it('snaps and fits melody notes', () => {
    expect(snapToScale(61, 'C', 'major')).toBe(60)
    expect(fitToVoice(84)).toBe(72)
    expect(fitToVoice(40)).toBe(64)
    expect(chordPitches('C', 48)).toEqual([48, 52, 55])
  })

  it('counts syllables roughly', () => {
    expect(countSyllables('star')).toBe(1)
    expect(countSyllables('shining')).toBe(2)
    expect(countSyllables('everybody')).toBeGreaterThanOrEqual(3)
    expect(lineSyllables('Shine on, shining star')).toEqual([
      'Shine',
      'on,',
      'shining',
      '~',
      'star'
    ])
  })
})
