import * as Tone from 'tone'

// Records her voice in the same audio context as the song, so the take lines up with the music.

export interface Take {
  blob: Blob
  /** Seconds to trim from the start of the recording so it lines up with song time 0. */
  trim: number
}

export interface VocalSession {
  /** 0–1 input level for visuals. */
  level: () => number
  /** Context time at which the song should start (a short lead-in after recording begins). */
  songStart: number
  stop: () => Promise<Take>
}

const LEAD_IN = 0.15

export async function startVocalSession(): Promise<VocalSession | null> {
  if (!(await window.musix.media.askMic())) return null
  await Tone.start()
  let stream: MediaStream
  try {
    // Raw input: echo cancellation and auto-gain would mangle singing.
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    })
  } catch {
    return null
  }
  const ctx = Tone.getContext()
  const raw = ctx.rawContext as AudioContext
  const source = raw.createMediaStreamSource(stream)
  const recorder = new Tone.Recorder()
  const meter = new Tone.Meter({ normalRange: true, smoothing: 0.6 })
  Tone.connect(source, recorder)
  Tone.connect(source, meter)
  await recorder.start()
  const startedAt = ctx.currentTime
  const songStart = startedAt + LEAD_IN

  // She hears the music late (output latency) and her voice reaches us late (input latency).
  const latency = (raw.outputLatency || 0) + (raw.baseLatency || 0) + 0.01

  return {
    level: () => Math.min(1, (meter.getValue() as number) * 4),
    songStart,
    stop: async () => {
      const blob = await recorder.stop()
      stream.getTracks().forEach((t) => t.stop())
      source.disconnect()
      recorder.dispose()
      meter.dispose()
      return { blob, trim: LEAD_IN + latency }
    }
  }
}
