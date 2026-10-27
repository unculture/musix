import { NOTE_NAMES } from '../project'

export type ScaleName = 'major' | 'minor'
export type KeyName = (typeof NOTE_NAMES)[number]

export const SCALES: Record<ScaleName, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10]
}

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export const mod12 = (n: number): number => ((n % 12) + 12) % 12

export function pitchClass(name: string): number | null {
  const m = name.trim().match(/^([A-Ga-g])([#b]?)/)
  if (!m) return null
  return mod12(LETTER_PC[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0))
}

export const pcName = (pc: number): KeyName => NOTE_NAMES[mod12(pc)]

/** 'E4' → 64, 'Bb3' → 58. Returns null for anything else (e.g. 'rest'). */
export function noteToMidi(name: string): number | null {
  const m = name.trim().match(/^([A-Ga-g][#b]?)(-?\d)$/)
  if (!m) return null
  const pc = pitchClass(m[1])
  return pc === null ? null : pc + (Number(m[2]) + 1) * 12
}

export const midiToNote = (midi: number): string => `${pcName(midi)}${Math.floor(midi / 12) - 1}`

const QUALITIES: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  add9: [0, 4, 7, 14],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9]
}

export interface ParsedChord {
  root: number
  intervals: number[]
}

export function parseChord(symbol: string): ParsedChord | null {
  const m = symbol
    .trim()
    .match(/^([A-G][#b]?)(maj7|m7|m6|m|7|6|sus2|sus4|dim|aug|add9)?(?:\/[A-G][#b]?)?$/)
  if (!m) return null
  return { root: pitchClass(m[1])!, intervals: QUALITIES[m[2] ?? ''] }
}

/** The chord built on a scale degree (0-based), e.g. degree 4 in C major → 'G'. */
export function diatonicChord(key: KeyName, scale: ScaleName, degree: number): string {
  const steps = SCALES[scale]
  const d = ((degree % 7) + 7) % 7
  const at = (i: number): number => steps[(d + i) % 7] + (d + i >= 7 ? 12 : 0)
  const third = at(2) - at(0)
  const fifth = at(4) - at(0)
  const quality = fifth === 6 ? 'dim' : third === 3 ? 'm' : ''
  return pcName(pitchClass(key)! + steps[d]) + quality
}

/** Is this MIDI pitch in the key's scale? */
export function inScale(midi: number, key: KeyName, scale: ScaleName): boolean {
  return SCALES[scale].includes(mod12(midi - pitchClass(key)!))
}

/** Nudge a pitch to the nearest scale note (prefers down on ties). */
export function snapToScale(midi: number, key: KeyName, scale: ScaleName): number {
  for (const offset of [0, -1, 1, -2, 2])
    if (inScale(midi + offset, key, scale)) return midi + offset
  return midi
}

/** Pitches of a chord as MIDI notes, rooted near `base`. */
export function chordPitches(symbol: string, base = 48): number[] {
  const chord = parseChord(symbol)
  if (!chord) return []
  const root = base + mod12(chord.root - base)
  return chord.intervals.map((i) => root + i)
}

/** A comfortable singing range for a child: A3 … E5. */
export const VOICE_LOW = 57
export const VOICE_HIGH = 76

export function fitToVoice(midi: number): number {
  let m = midi
  while (m < VOICE_LOW) m += 12
  while (m > VOICE_HIGH) m -= 12
  return m
}

/** Rough English syllable count — good enough to fit words to notes. */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  if (w.length <= 3) return 1
  const trimmed = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '')
  const groups = trimmed.match(/[aeiouy]{1,2}/g)
  return Math.max(1, groups ? groups.length : 1)
}

/** Split a lyric line into sung syllables: the word on its first note, '~' for held-on syllables. */
export function lineSyllables(line: string): string[] {
  return line
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w))
    .flatMap((word) => {
      const n = countSyllables(word) || 1
      return [word, ...Array(n - 1).fill('~')]
    })
}
