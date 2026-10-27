import * as Tone from 'tone'

// A friendly woodblock click for count-ins and keeping time while she hums.
let click: Tone.MembraneSynth | null = null

function synth(): Tone.MembraneSynth {
  click ??= new Tone.MembraneSynth({
    pitchDecay: 0.008,
    octaves: 2,
    envelope: { attack: 0.001, decay: 0.08, sustain: 0 }
  }).toDestination()
  return click
}

/** Play `beats` clicks at `bpm`, accenting the first. Resolves when the count-in is over. */
export async function countIn(bpm: number, beats = 4): Promise<void> {
  await Tone.start()
  const s = synth()
  const now = Tone.now() + 0.05
  const step = 60 / bpm
  for (let i = 0; i < beats; i++)
    s.triggerAttackRelease(i === 0 ? 'C6' : 'G5', 0.05, now + i * step, i === 0 ? 0.9 : 0.6)
  await new Promise((r) => setTimeout(r, (beats * step + 0.05) * 1000))
}

/** Keep clicking quietly until stopped. Returns a stop function. */
export function startClicks(bpm: number): () => void {
  const s = synth()
  const step = 60 / bpm
  let next = Tone.now() + step
  let beat = 0
  const timer = setInterval(() => {
    while (next < Tone.now() + 0.2) {
      s.triggerAttackRelease(beat % 4 === 0 ? 'C6' : 'G5', 0.03, next, 0.25)
      next += step
      beat++
    }
  }, 50)
  return () => clearInterval(timer)
}
