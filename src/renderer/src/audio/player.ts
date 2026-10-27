import * as Tone from 'tone'
import { create } from 'zustand'
import type { Project } from '@shared/project'
import { applyMix, buildSong, type BuiltSong } from './build'

// The live song player. One song is loaded at a time; changing the plan rebuilds it.

type Status = 'empty' | 'loading' | 'ready' | 'error'

interface PlayerState {
  status: Status
  playing: boolean
  /** Seconds from the start. */
  position: number
  duration: number
  bpm: number
  song: BuiltSong | null
  load: (project: Project) => Promise<void>
  /** Start playing; `at` is an optional audio-context time to start exactly then. */
  play: (at?: number) => Promise<void>
  pause: () => void
  stop: () => void
  seek: (seconds: number) => void
  unload: () => void
}

let loadedKey = ''
let loadToken = 0
let raf = 0

const transport = (): ReturnType<typeof Tone.getTransport> => Tone.getTransport()

function tick(): void {
  const { duration, playing } = usePlayer.getState()
  if (!playing) return
  const position = transport().seconds
  if (position >= duration) {
    usePlayer.getState().stop()
    return
  }
  usePlayer.setState({ position })
  raf = requestAnimationFrame(tick)
}

export const usePlayer = create<PlayerState>()((set, get) => ({
  status: 'empty',
  playing: false,
  position: 0,
  duration: 0,
  bpm: 120,
  song: null,

  load: async (project) => {
    if (!project.plan) return get().unload()
    // Volume and mute don't need a rebuild — only structural changes do.
    const structure = {
      ...project.plan,
      parts: project.plan.parts.map((p) => ({ role: p.role, instrument: p.instrument }))
    }
    const layers = project.layers.map((l) => ({ id: l.id, file: l.file, offset: l.offset }))
    const key = JSON.stringify([project.id, structure, layers])
    const current = get().song
    if (key === loadedKey && current && get().status !== 'error') {
      applyMix(current, project.plan, project.layers)
      return
    }
    const token = ++loadToken
    const wasPlaying = get().playing
    const resumeAt = get().position
    get().pause()
    transport().cancel()
    get().song?.dispose()
    set({ status: 'loading', song: null })
    try {
      transport().bpm.value = project.plan.bpm
      const song = await buildSong(project.plan, transport(), {
        projectId: project.id,
        layers: project.layers
      })
      if (token !== loadToken) {
        song.dispose()
        return
      }
      loadedKey = key
      const position = Math.min(resumeAt, song.duration)
      transport().seconds = position
      set({ status: 'ready', song, duration: song.duration, bpm: project.plan.bpm, position })
      if (wasPlaying) await get().play()
    } catch (e) {
      console.error(e)
      if (token === loadToken) set({ status: 'error' })
    }
  },

  play: async (at) => {
    if (get().status !== 'ready') return
    await Tone.start()
    if (transport().seconds >= get().duration - 0.05) transport().seconds = 0
    transport().start(at)
    set({ playing: true })
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(tick)
  },

  pause: () => {
    transport().pause()
    cancelAnimationFrame(raf)
    set({ playing: false, position: transport().seconds })
  },

  stop: () => {
    transport().stop()
    cancelAnimationFrame(raf)
    transport().seconds = 0
    set({ playing: false, position: 0 })
  },

  seek: (seconds) => {
    const s = Math.max(0, Math.min(seconds, get().duration))
    transport().seconds = s
    set({ position: s })
  },

  unload: () => {
    get().stop()
    transport().cancel()
    get().song?.dispose()
    loadedKey = ''
    set({ status: 'empty', song: null, duration: 0 })
  }
}))
