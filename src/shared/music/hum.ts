import type { Note } from '../project'
import {
  mod12,
  pcName,
  snapToScale,
  VOICE_HIGH,
  VOICE_LOW,
  type KeyName,
  type ScaleName
} from './theory'

// Turning a hummed recording's raw pitch detections into a tidy, singable melody.

export interface DetectedNote {
  /** Seconds. */
  start: number
  duration: number
  pitch: number
  amplitude: number
}

/** Humming is one note at a time: drop blips and resolve overlaps in favour of the louder note. */
export function monophonic(notes: DetectedNote[], minDuration = 0.1): DetectedNote[] {
  const long = notes.filter((n) => n.duration >= minDuration)
  // Squeaks and rumbles far from the rest of the tune are detection mistakes.
  const sortedPitches = long.map((n) => n.pitch).sort((a, b) => a - b)
  const median = sortedPitches[Math.floor(sortedPitches.length / 2)]
  const sorted = long
    .filter((n) => Math.abs(n.pitch - median) <= 12)
    .sort((a, b) => a.start - b.start)
  const out: DetectedNote[] = []
  for (const n of sorted) {
    const prev = out[out.length - 1]
    if (!prev || n.start >= prev.start + prev.duration - 0.02) {
      out.push({ ...n })
    } else if (n.start >= prev.start + prev.duration / 2) {
      // Notes in a hum blur into each other a little: trim the tail of the previous one.
      prev.duration = n.start - prev.start
      if (prev.duration < minDuration) out.pop()
      out.push({ ...n })
    } else if (n.amplitude > prev.amplitude) {
      prev.duration = Math.max(0.01, n.start - prev.start)
      if (prev.duration < minDuration) out.pop()
      out.push({ ...n })
    }
  }
  return out
}

// Krumhansl–Kessler key profiles.
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

function correlation(a: number[], b: number[]): number {
  const mean = (xs: number[]): number => xs.reduce((t, x) => t + x, 0) / xs.length
  const ma = mean(a)
  const mb = mean(b)
  let num = 0
  let da = 0
  let db = 0
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb)
    da += (a[i] - ma) ** 2
    db += (b[i] - mb) ** 2
  }
  return da && db ? num / Math.sqrt(da * db) : 0
}

/** Best-fitting key for a set of notes, weighted by how long each is held. */
export function detectKey(notes: { pitch: number; duration: number }[]): {
  key: KeyName
  scale: ScaleName
} {
  const hist = Array(12).fill(0)
  for (const n of notes) hist[mod12(n.pitch)] += n.duration
  let best = { key: 'C' as KeyName, scale: 'major' as ScaleName, score: -Infinity }
  for (let tonic = 0; tonic < 12; tonic++) {
    const rotated = hist.map((_, i) => hist[(i + tonic) % 12])
    for (const [scale, profile] of [
      ['major', MAJOR],
      ['minor', MINOR]
    ] as const) {
      const score = correlation(rotated, profile)
      if (score > best.score) best = { key: pcName(tonic), scale, score }
    }
  }
  return { key: best.key, scale: best.scale }
}

const q = (n: number, step: number): number => Math.round(n / step) * step

/**
 * Detected notes (seconds) → melody notes (beats from the first note), snapped to `grid` beats,
 * nudged into the key, and moved by whole octaves into a comfortable singing range.
 */
export function humToMelody(
  detected: DetectedNote[],
  bpm: number,
  opts: { grid?: number; key?: KeyName; scale?: ScaleName } = {}
): { notes: Note[]; key: KeyName; scale: ScaleName } {
  const grid = opts.grid ?? 0.25
  const mono = monophonic(detected)
  if (mono.length === 0) return { notes: [], key: opts.key ?? 'C', scale: opts.scale ?? 'major' }
  const { key, scale } =
    opts.key && opts.scale ? { key: opts.key, scale: opts.scale } : detectKey(mono)
  const beat = (s: number): number => (s * bpm) / 60
  const origin = beat(mono[0].start)

  // Shift by whole octaves so as much of the tune as possible sits in the child's range.
  const inRange = (k: number): number =>
    mono.filter((n) => n.pitch + k >= VOICE_LOW && n.pitch + k <= VOICE_HIGH).length
  const mean = mono.reduce((t, n) => t + n.pitch, 0) / mono.length
  const shift = [-24, -12, 0, 12, 24].reduce((best, k) =>
    inRange(k) > inRange(best) ||
    (inRange(k) === inRange(best) && Math.abs(mean + k - 66) < Math.abs(mean + best - 66))
      ? k
      : best
  )

  const notes: Note[] = []
  for (const n of mono) {
    const start = Math.max(0, q(beat(n.start) - origin, grid))
    const duration = Math.max(grid, q(beat(n.duration), grid))
    const prev = notes[notes.length - 1]
    if (prev && start < prev.start + prev.duration) {
      if (start <= prev.start) {
        // Two notes landed on the same grid slot: keep the longer one.
        if (duration > prev.duration) notes.pop()
        else continue
      } else prev.duration = start - prev.start
    }
    notes.push({
      pitch: snapToScale(n.pitch + shift, key, scale),
      start,
      duration,
      velocity: Math.min(1, 0.5 + n.amplitude / 2)
    })
  }
  return { notes, key, scale }
}
