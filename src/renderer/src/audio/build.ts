import * as Tone from 'tone'
import type { AudioLayer, PartRole, SongPlan } from '@shared/project'
import { arrange, beatsToSeconds, type Arrangement } from '@shared/music/arrange'
import { createDrumVoice, createPitchedVoice, type DrumVoice, type PitchedVoice } from './voices'

// Builds the whole song graph in Tone's current context and schedules it on `transport`.
// Used by the live player and by Tone.Offline for export.

/** Base level of each part before the mixer, so a fresh song is already balanced. */
export const ROLE_GAIN: Record<PartRole, number> = {
  drums: 0.9,
  bass: 0.8,
  chords: 0.55,
  pad: 0.4,
  melody: 0.7
}
const REVERB_SEND: Record<PartRole, number> = {
  drums: 0.08,
  bass: 0,
  chords: 0.25,
  pad: 0.4,
  melody: 0.3
}

export const TAIL_SECONDS = 3

export interface BuiltSong {
  arrangement: Arrangement
  /** Seconds, including a short tail for reverb and releases. */
  duration: number
  channels: Partial<Record<PartRole, Tone.Channel>>
  layerChannels: Record<string, Tone.Channel>
  dispose: () => void
}

export interface BuildOptions {
  projectId?: string
  layers?: AudioLayer[]
}

export async function buildSong(
  plan: SongPlan,
  transport: ReturnType<typeof Tone.getTransport>,
  opts: BuildOptions = {}
): Promise<BuiltSong> {
  const arrangement = arrange(plan)
  const sec = (beats: number): number => beatsToSeconds(beats, plan.bpm)

  // Glue compressor → make-up gain → limiter, so songs sit at a normal listening level.
  const limiter = new Tone.Limiter(-2).toDestination()
  const makeup = new Tone.Gain(Tone.dbToGain(5)).connect(limiter)
  const master = new Tone.Compressor({
    threshold: -18,
    ratio: 3,
    attack: 0.01,
    release: 0.2
  }).connect(makeup)
  const reverb = new Tone.Reverb({ decay: 2.4, wet: 1 }).connect(master)
  const disposables: { dispose: () => void }[] = [limiter, makeup, master, reverb]

  const channels: BuiltSong['channels'] = {}
  const pitched: Partial<Record<PartRole, PitchedVoice>> = {}
  let drums: DrumVoice | null = null

  for (const part of plan.parts) {
    const voice =
      part.role === 'drums' ? createDrumVoice(part.instrument) : createPitchedVoice(part.instrument)
    if (!voice) continue
    const channel = new Tone.Channel({
      volume: Tone.gainToDb(Math.max(0.0001, part.volume * ROLE_GAIN[part.role])),
      mute: part.muted
    }).connect(master)
    const send = new Tone.Gain(REVERB_SEND[part.role]).connect(reverb)
    channel.connect(send)
    voice.output.connect(channel)
    channels[part.role] = channel
    disposables.push(channel, send, voice)
    if (part.role === 'drums') drums = voice as DrumVoice
    else pitched[part.role] = voice as PitchedVoice
  }

  for (const e of arrangement.events) {
    if (e.role === 'drums') {
      if (drums) {
        const d = drums
        transport.schedule((time) => d.play(e.sound, time, e.velocity), sec(e.time))
      }
    } else {
      const v = pitched[e.role]
      if (v)
        transport.schedule(
          (time) => v.play(e.pitches, time, sec(e.duration), e.velocity),
          sec(e.time)
        )
    }
  }

  // Recorded and AI-generated audio layers play in sync with the transport.
  const layerChannels: Record<string, Tone.Channel> = {}
  const layerPlayers: { layer: AudioLayer; player: Tone.Player }[] = []
  for (const layer of opts.layers ?? []) {
    if (!opts.projectId) break
    const channel = new Tone.Channel({
      volume: Tone.gainToDb(Math.max(0.0001, layer.volume)),
      mute: layer.muted
    }).connect(master)
    const player = new Tone.Player(
      `musix://song/${opts.projectId}/${encodeURIComponent(layer.file)}`
    ).connect(channel)
    // A negative offset trims the start of the audio so its first beat lands on the song's first beat.
    if (layer.offset >= 0) player.sync().start(layer.offset)
    else player.sync().start(0, -layer.offset)
    layerChannels[layer.id] = channel
    layerPlayers.push({ layer, player })
    disposables.push(player, channel)
  }

  await Promise.all([Tone.loaded(), reverb.ready])

  let duration = sec(arrangement.totalBeats) + TAIL_SECONDS
  // Make sure long audio layers aren't cut off.
  for (const { layer, player } of layerPlayers)
    duration = Math.max(duration, layer.offset + player.buffer.duration + 0.5)

  return {
    arrangement,
    duration,
    channels,
    layerChannels,
    dispose: () => disposables.forEach((d) => d.dispose())
  }
}

const level = (v: number): number => Tone.gainToDb(Math.max(0.0001, v))

/** Apply volume / mute changes to a built song without rebuilding it. */
export function applyMix(song: BuiltSong, plan: SongPlan, layers: AudioLayer[] = []): void {
  for (const part of plan.parts) {
    const ch = song.channels[part.role]
    if (!ch) continue
    ch.volume.rampTo(level(part.volume * ROLE_GAIN[part.role]), 0.05)
    ch.mute = part.muted
  }
  for (const layer of layers) {
    const ch = song.layerChannels[layer.id]
    if (!ch) continue
    ch.volume.rampTo(level(layer.volume), 0.05)
    ch.mute = layer.muted
  }
}
