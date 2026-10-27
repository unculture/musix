import * as Tone from 'tone'
import type { PartRole } from '@shared/project'
import { createDrumVoice, createPitchedVoice } from './voices'

// A two-second taste of an instrument, so she can choose by ear rather than by name.
const PHRASES: Record<Exclude<PartRole, 'drums'>, { t: number; p: number[]; d: number }[]> = {
  bass: [
    { t: 0, p: [36], d: 0.4 },
    { t: 0.5, p: [43], d: 0.4 },
    { t: 1, p: [48], d: 0.8 }
  ],
  chords: [
    { t: 0, p: [60, 64, 67], d: 0.9 },
    { t: 1, p: [57, 60, 65], d: 0.9 }
  ],
  pad: [{ t: 0, p: [60, 64, 67, 72], d: 1.8 }],
  melody: [
    { t: 0, p: [72], d: 0.25 },
    { t: 0.3, p: [76], d: 0.25 },
    { t: 0.6, p: [79], d: 0.25 },
    { t: 0.9, p: [84], d: 0.8 }
  ]
}
const BEAT: { t: number; s: 'kick' | 'snare' | 'hihat' }[] = [
  { t: 0, s: 'kick' },
  { t: 0, s: 'hihat' },
  { t: 0.25, s: 'hihat' },
  { t: 0.5, s: 'snare' },
  { t: 0.5, s: 'hihat' },
  { t: 0.75, s: 'hihat' },
  { t: 1, s: 'kick' },
  { t: 1, s: 'hihat' },
  { t: 1.25, s: 'kick' },
  { t: 1.5, s: 'snare' },
  { t: 1.5, s: 'hihat' }
]

let current: { dispose: () => void } | null = null
let styleVoices: { dispose: () => void }[] = []

export async function previewInstrument(role: PartRole, id: string): Promise<void> {
  await Tone.start()
  current?.dispose()
  current = null
  if (role === 'drums') {
    const voice = createDrumVoice(id)
    if (!voice) return
    voice.output.toDestination()
    current = voice
    await Tone.loaded()
    const now = Tone.now() + 0.05
    for (const b of BEAT) voice.play(b.s, now + b.t, 0.8)
  } else {
    const voice = createPitchedVoice(id)
    if (!voice) return
    voice.output.toDestination()
    current = voice
    await Tone.loaded()
    const now = Tone.now() + 0.05
    for (const n of PHRASES[role]) voice.play(n.p, now + n.t, n.d, 0.7)
  }
  const mine = current
  setTimeout(() => {
    if (current === mine) {
      mine?.dispose()
      current = null
    }
  }, 4000)
}

/** A quick taste of a style card: its drums and chord instrument playing together. */
export async function previewStyle(instruments: Record<PartRole, string>): Promise<void> {
  await Tone.start()
  styleVoices.forEach((v) => v.dispose())
  const drums = createDrumVoice(instruments.drums)
  const chords = createPitchedVoice(instruments.chords)
  const bass = createPitchedVoice(instruments.bass)
  const mine = [drums, chords, bass].filter((v): v is NonNullable<typeof v> => v !== null)
  mine.forEach((v) => v.output.toDestination())
  styleVoices = mine
  await Tone.loaded()
  if (styleVoices !== mine) return
  const now = Tone.now() + 0.05
  if (drums) for (const b of BEAT) drums.play(b.s, now + b.t, 0.7)
  for (const n of PHRASES.chords) chords?.play(n.p, now + n.t, n.d, 0.5)
  for (const n of PHRASES.bass) bass?.play(n.p, now + n.t, n.d, 0.6)
  setTimeout(() => {
    if (styleVoices === mine) {
      mine.forEach((v) => v.dispose())
      styleVoices = []
    }
  }, 4000)
}
