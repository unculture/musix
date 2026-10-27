// Finding the beat in a generated backing track, so our guide tune and karaoke line up with it.

export interface BeatGrid {
  bpm: number
  /** Seconds into the audio of the first beat. */
  firstBeat: number
  /** 0–1: how clearly the beat stood out. */
  confidence: number
}

const HOP = 512

function lowpass(samples: Float32Array, sampleRate: number, hz: number): Float32Array {
  const out = new Float32Array(samples.length)
  const a = Math.exp((-2 * Math.PI * hz) / sampleRate)
  let y = 0
  for (let i = 0; i < samples.length; i++) out[i] = y = (1 - a) * samples[i] + a * y
  return out
}

function onsetStrength(samples: Float32Array): Float32Array {
  const frames = Math.floor(samples.length / HOP)
  const energy = new Float32Array(frames)
  for (let f = 0; f < frames; f++) {
    let e = 0
    for (let i = f * HOP; i < (f + 1) * HOP; i++) e += samples[i] * samples[i]
    energy[f] = Math.log1p(e * 100)
  }
  const onset = new Float32Array(frames)
  for (let f = 1; f < frames; f++) onset[f] = Math.max(0, energy[f] - energy[f - 1])
  return onset
}

function peak(xs: Float32Array): number {
  let m = 1e-9
  for (const x of xs) if (x > m) m = x
  return m
}

/** Frame indices of beats, given an onset envelope and the beat period in frames (Ellis 2007). */
export function trackBeats(env: Float32Array, period: number): number[] {
  const n = env.length
  const score = new Float32Array(n)
  const back = new Int32Array(n).fill(-1)
  const alpha = 100
  for (let t = 0; t < n; t++) {
    let best = 0
    let from = -1
    for (let p = Math.max(0, Math.floor(t - 2 * period)); p <= t - Math.round(period / 2); p++) {
      const s = score[p] - alpha * Math.log((t - p) / period) ** 2
      if (s > best) {
        best = s
        from = p
      }
    }
    score[t] = env[t] + best
    back[t] = from
  }
  let t = n - 1
  for (let i = Math.max(0, n - Math.round(period)); i < n; i++) if (score[i] > score[t]) t = i
  const beats: number[] = []
  while (t >= 0) {
    beats.push(t)
    t = back[t]
  }
  return beats.reverse()
}

/**
 * Estimate tempo and beat phase. `expectedBpm` resolves half/double-time ambiguity
 * (we asked the music model for a tempo, so it's probably near that).
 */
export function estimateBeat(
  samples: Float32Array,
  sampleRate: number,
  expectedBpm: number
): BeatGrid {
  const onset = onsetStrength(samples)
  const kick = onsetStrength(lowpass(samples, sampleRate, 150))
  const fps = sampleRate / HOP
  const score = (bpm: number): number => {
    const lag = (fps * 60) / bpm
    let s = 0
    for (let k = 1; k <= 4; k++) {
      const l = lag * k
      const lo = Math.floor(l)
      const frac = l - lo
      for (let i = 0; i + lo + 1 < onset.length; i++)
        s += onset[i] * (onset[i + lo] * (1 - frac) + onset[i + lo + 1] * frac)
    }
    return s
  }

  // 1. Rough tempo from autocorrelation of the onset envelope.
  const scores: { bpm: number; s: number }[] = []
  for (let bpm = 60; bpm <= 200; bpm += 0.5) scores.push({ bpm, s: score(bpm) })
  const max = Math.max(...scores.map((x) => x.s))
  const mean = scores.reduce((t, x) => t + x.s, 0) / scores.length
  const confidence = max > 0 ? Math.min(1, (max - mean) / max) : 0

  // Among strong candidates, prefer the one closest to what we asked for (allowing half/double time).
  const strong = scores.filter((x) => x.s >= max * 0.85)
  const distance = (bpm: number): number =>
    Math.min(...[bpm, bpm * 2, bpm / 2].map((b) => Math.abs(Math.log2(b / expectedBpm))))
  let bpm = strong.reduce((a, b) => (distance(b.bpm) < distance(a.bpm) ? b : a)).bpm
  if (Math.abs(Math.log2((bpm * 2) / expectedBpm)) < Math.abs(Math.log2(bpm / expectedBpm)))
    bpm *= 2
  else if (Math.abs(Math.log2(bpm / 2 / expectedBpm)) < Math.abs(Math.log2(bpm / expectedBpm)))
    bpm /= 2

  // 2. Track individual beats, leaning on the low end (kick drums mark the beat best), then fit a
  //    straight line through them: the slope is a precise tempo and the intercept the first beat.
  const env = new Float32Array(onset.length)
  const no = peak(onset)
  const nk = peak(kick)
  for (let i = 0; i < env.length; i++) env[i] = onset[i] / no + (2 * kick[i]) / nk
  const beats = trackBeats(env, (fps * 60) / bpm)
  if (beats.length < 8) return { bpm, firstBeat: (beats[0] ?? 0) / fps, confidence }

  const n = beats.length
  const mx = (n - 1) / 2
  const my = beats.reduce((t, b) => t + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (i - mx) * (beats[i] - my)
    den += (i - mx) ** 2
  }
  const period = num / den / fps
  const intercept = (my - (num / den) * mx) / fps
  return {
    bpm: Math.round((60 / period) * 100) / 100,
    firstBeat: intercept - Math.floor(intercept / period) * period,
    confidence
  }
}
