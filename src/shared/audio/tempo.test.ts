import { describe, expect, it } from 'vitest'
import { estimateBeat } from './tempo'

function clickTrack(bpm: number, seconds: number, firstBeat: number, rate = 22050): Float32Array {
  const out = new Float32Array(seconds * rate)
  const spb = 60 / bpm
  for (let t = firstBeat, k = 0; t < seconds; t += spb, k++) {
    const start = Math.floor(t * rate)
    const loud = k % 4 === 0 ? 1 : 0.6
    for (let i = 0; i < 400 && start + i < out.length; i++)
      out[start + i] = Math.sin(i * 0.3) * Math.exp(-i / 80) * loud
  }
  // A little noise so it isn't too easy.
  for (let i = 0; i < out.length; i++) out[i] += ((Math.sin(i * 12.9898) * 43758.5453) % 1) * 0.01
  return out
}

describe('estimateBeat', () => {
  it('finds tempo and phase of a click track', () => {
    const g = estimateBeat(clickTrack(118, 20, 0.31), 22050, 120)
    expect(g.bpm).toBeGreaterThan(117)
    expect(g.bpm).toBeLessThan(119)
    expect(g.firstBeat).toBeCloseTo(0.31, 1)
  })

  it('uses the expected tempo to pick between half and double time', () => {
    const fast = estimateBeat(clickTrack(140, 20, 0), 22050, 70)
    expect(fast.bpm).toBeCloseTo(70, 0)
  })
})
