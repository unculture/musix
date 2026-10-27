import { describe, expect, it } from 'vitest'
import { detectKey, humToMelody, monophonic, type DetectedNote } from './hum'
import { inScale, VOICE_HIGH, VOICE_LOW } from './theory'

const n = (start: number, duration: number, pitch: number, amplitude = 0.6): DetectedNote => ({
  start,
  duration,
  pitch,
  amplitude
})

describe('monophonic', () => {
  it('drops blips and keeps the louder of overlapping notes', () => {
    const out = monophonic([n(0, 0.5, 60), n(0.2, 0.4, 72, 0.9), n(1, 0.03, 65), n(1.2, 0.3, 64)])
    expect(out.map((x) => x.pitch)).toEqual([60, 72, 64])
    expect(out[0].duration).toBeCloseTo(0.2)
  })
})

describe('detectKey', () => {
  it('finds C major from a C major tune', () => {
    const tune = [60, 62, 64, 65, 67, 65, 64, 62, 60, 67, 64, 60].map((p) => ({
      pitch: p,
      duration: 0.5
    }))
    expect(detectKey(tune)).toEqual({ key: 'C', scale: 'major' })
  })

  it('finds A minor from an A minor tune', () => {
    const tune = [57, 60, 64, 62, 60, 59, 57, 64, 57, 60, 57].map((p) => ({
      pitch: p,
      duration: 0.5
    }))
    expect(detectKey(tune)).toEqual({ key: 'A', scale: 'minor' })
  })
})

describe('humToMelody', () => {
  it('quantises a slightly sloppy hum at 120 bpm into beats', () => {
    // Hummed an octave low and a bit out of time.
    const hum = [n(1.02, 0.48, 48), n(1.51, 0.47, 52), n(2.03, 0.5, 55), n(2.49, 0.95, 53)]
    const { notes, key } = humToMelody(hum, 120)
    expect(notes.map((x) => x.start)).toEqual([0, 1, 2, 3])
    expect(notes.map((x) => x.duration)).toEqual([1, 1, 1, 2])
    for (const x of notes) {
      expect(x.pitch).toBeGreaterThanOrEqual(VOICE_LOW)
      expect(x.pitch).toBeLessThanOrEqual(VOICE_HIGH)
      expect(inScale(x.pitch, key, 'major') || inScale(x.pitch, key, 'minor')).toBe(true)
    }
    // Contour is kept: up, up, down.
    expect(notes[1].pitch).toBeGreaterThan(notes[0].pitch)
    expect(notes[2].pitch).toBeGreaterThan(notes[1].pitch)
    expect(notes[3].pitch).toBeLessThan(notes[2].pitch)
  })

  it('returns nothing for silence', () => {
    expect(humToMelody([], 100).notes).toEqual([])
  })
})

describe('real-world detections', () => {
  it('handles a blip on top of the first note, an outlier and a collision', () => {
    const raw = [
      n(0, 0.1, 71),
      n(0.06, 1.15, 59),
      n(1.21, 0.3, 58),
      n(2.49, 1.2, 56),
      n(6.2, 0.1, 89)
    ]
    const { notes } = humToMelody(raw, 120)
    expect(notes.map((x) => x.start)).toEqual([0, 2.25, 4.75])
    expect(notes[0].duration).toBeGreaterThanOrEqual(2)
  })
})
