import {
  addPitchBendsToNoteEvents,
  BasicPitch,
  noteFramesToTime,
  outputToNotesPoly
} from '@spotify/basic-pitch'
import type { DetectedNote } from '@shared/music/hum'

// Pitch detection for humming, using Spotify's Basic Pitch model (runs locally, no internet).

const MODEL_URL = 'musix://models/basic-pitch/model.json'
const MODEL_RATE = 22050
let model: BasicPitch | null = null

async function toModelInput(blob: Blob): Promise<Float32Array> {
  const ctx = new AudioContext()
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer())
  await ctx.close()
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * MODEL_RATE), MODEL_RATE)
  const src = offline.createBufferSource()
  src.buffer = decoded
  src.connect(offline.destination)
  src.start()
  return (await offline.startRendering()).getChannelData(0)
}

export async function detectNotes(
  blob: Blob,
  onProgress?: (fraction: number) => void
): Promise<DetectedNote[]> {
  model ??= new BasicPitch(MODEL_URL)
  const audio = await toModelInput(blob)
  const frames: number[][] = []
  const onsets: number[][] = []
  const contours: number[][] = []
  await model.evaluateModel(
    audio,
    (f, o, c) => {
      frames.push(...f)
      onsets.push(...o)
      contours.push(...c)
    },
    (p) => onProgress?.(p)
  )
  // Settings tuned for a single hummed/sung voice: moderately sensitive, min note ~ 60 ms.
  const notes = noteFramesToTime(
    addPitchBendsToNoteEvents(contours, outputToNotesPoly(frames, onsets, 0.4, 0.3, 7))
  )
  return notes.map((n) => ({
    start: n.startTimeSeconds,
    duration: n.durationSeconds,
    pitch: n.pitchMidi,
    amplitude: n.amplitude
  }))
}

/** Run the model once on silence so the first real hum is analysed quickly. */
let warming: Promise<void> | null = null
export function warmUp(): Promise<void> {
  model ??= new BasicPitch(MODEL_URL)
  warming ??= model
    .evaluateModel(
      new Float32Array(MODEL_RATE),
      () => {},
      () => {}
    )
    .catch(() => {})
  return warming
}
