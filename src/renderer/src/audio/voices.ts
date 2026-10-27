import * as Tone from 'tone'
import {
  DRUM_KITS,
  DRUM_SOUNDS,
  REGISTER_NOTES,
  VOICES,
  type DrumSound
} from '@shared/music/samples'

// Creates playable instruments from the catalogue. Everything is created in Tone's current
// context, so the same code works for live playback and offline rendering.

export const SAMPLE_BASE = 'musix://samples/'

export interface PitchedVoice {
  output: Tone.ToneAudioNode
  play: (pitches: number[], time: number, duration: number, velocity: number) => void
  dispose: () => void
}

export interface DrumVoice {
  output: Tone.ToneAudioNode
  play: (sound: DrumSound, time: number, velocity: number) => void
  dispose: () => void
}

const hz = (midi: number): number => Tone.Frequency(midi, 'midi').toFrequency()

export function createPitchedVoice(id: string): PitchedVoice | null {
  const voice = VOICES[id]
  if (!voice || voice.kind === 'none') return null
  const out = new Tone.Gain(voice.gain ?? 1)

  if (voice.kind === 'sampled') {
    const urls = Object.fromEntries(REGISTER_NOTES[voice.register].map((n) => [n, `${n}.mp3`]))
    const sampler = new Tone.Sampler({
      urls,
      baseUrl: `${SAMPLE_BASE}${voice.gm}/`,
      release: voice.release ?? 0.5
    }).connect(out)
    return {
      output: out,
      play: (pitches, time, duration, velocity) =>
        sampler.triggerAttackRelease(pitches.map(hz), duration, time, velocity),
      dispose: () => {
        sampler.dispose()
        out.dispose()
      }
    }
  }

  const type = voice.synth === 'fatsaw' ? 'fatsawtooth' : voice.synth
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: type === 'fatsawtooth' ? { type: 'fatsawtooth', count: 3, spread: 30 } : { type },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: voice.release ?? 0.4 }
  }).connect(out)
  synth.maxPolyphony = 16
  return {
    output: out,
    play: (pitches, time, duration, velocity) =>
      synth.triggerAttackRelease(pitches.map(hz), duration, time, velocity),
    dispose: () => {
      synth.dispose()
      out.dispose()
    }
  }
}

export function createDrumVoice(kitId: string): DrumVoice | null {
  const kit = DRUM_KITS[kitId]
  if (!kit?.folder) return null
  const out = new Tone.Gain(kit.gain ?? 1)
  const urls = Object.fromEntries(
    DRUM_SOUNDS.map((s) => [s, `${SAMPLE_BASE}drums/${kit.folder}/${s}.mp3`])
  )
  const players = new Tone.Players({ urls }).connect(out)
  return {
    output: out,
    play: (sound, time, velocity) => {
      if (!players.has(sound)) return
      const p = players.player(sound)
      p.volume.setValueAtTime(Tone.gainToDb(velocity), time)
      p.start(time)
    },
    dispose: () => {
      players.dispose()
      out.dispose()
    }
  }
}
