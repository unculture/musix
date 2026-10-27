import type { Mood, PartRole } from './project'

// Style presets shown as picture cards. The prompt text feeds the AI composer and Lyria;
// the numbers and instruments give the engine sensible defaults if the AI is unavailable.
export interface StylePreset {
  id: string
  label: string
  emoji: string
  color: string
  prompt: string
  bpm: [number, number]
  scale: 'major' | 'minor'
  drumStyle: string
  instruments: Record<PartRole, string>
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'pop',
    label: 'Pop',
    emoji: '🎤',
    color: 'berry',
    prompt: 'catchy modern pop, bright synths, punchy drums, big singalong chorus',
    bpm: [100, 124],
    scale: 'major',
    drumStyle: 'pop',
    instruments: {
      drums: 'pop-kit',
      bass: 'synth-bass',
      chords: 'piano',
      pad: 'warm-pad',
      melody: 'bell-lead'
    }
  },
  {
    id: 'rock',
    label: 'Rock',
    emoji: '🎸',
    color: 'coral',
    prompt: 'energetic rock band, distorted electric guitars, live drums, bass guitar',
    bpm: [110, 150],
    scale: 'major',
    drumStyle: 'rock',
    instruments: {
      drums: 'rock-kit',
      bass: 'electric-bass',
      chords: 'electric-guitar',
      pad: 'organ',
      melody: 'lead-guitar'
    }
  },
  {
    id: 'disco',
    label: 'Disco',
    emoji: '🪩',
    color: 'grape',
    prompt: 'funky 70s disco, four-on-the-floor beat, groovy bass, strings and claps',
    bpm: [115, 128],
    scale: 'minor',
    drumStyle: 'disco',
    instruments: {
      drums: 'disco-kit',
      bass: 'funk-bass',
      chords: 'electric-piano',
      pad: 'strings',
      melody: 'synth-lead'
    }
  },
  {
    id: 'hiphop',
    label: 'Hip-hop',
    emoji: '🧢',
    color: 'sun',
    prompt: 'laid-back hip-hop beat, boom bap drums, deep bass, soulful keys',
    bpm: [84, 98],
    scale: 'minor',
    drumStyle: 'hiphop',
    instruments: {
      drums: 'boom-kit',
      bass: 'sub-bass',
      chords: 'electric-piano',
      pad: 'warm-pad',
      melody: 'bell-lead'
    }
  },
  {
    id: 'electronic',
    label: 'Electronic',
    emoji: '🎛️',
    color: 'sky',
    prompt: 'upbeat electronic dance music, pulsing synths, side-chained pads, big drops',
    bpm: [120, 128],
    scale: 'minor',
    drumStyle: 'house',
    instruments: {
      drums: 'electro-kit',
      bass: 'synth-bass',
      chords: 'supersaw',
      pad: 'warm-pad',
      melody: 'synth-lead'
    }
  },
  {
    id: 'country',
    label: 'Country',
    emoji: '🤠',
    color: 'sun',
    prompt: 'feel-good country, acoustic guitar strumming, banjo, brushed drums',
    bpm: [90, 120],
    scale: 'major',
    drumStyle: 'country',
    instruments: {
      drums: 'brush-kit',
      bass: 'acoustic-bass',
      chords: 'acoustic-guitar',
      pad: 'organ',
      melody: 'banjo'
    }
  },
  {
    id: 'lullaby',
    label: 'Lullaby',
    emoji: '🌙',
    color: 'grape',
    prompt: 'gentle lullaby, soft music box, warm piano, quiet strings, no drums',
    bpm: [60, 76],
    scale: 'major',
    drumStyle: 'none',
    instruments: {
      drums: 'none',
      bass: 'soft-bass',
      chords: 'piano',
      pad: 'strings',
      melody: 'music-box'
    }
  },
  {
    id: 'fairytale',
    label: 'Fairy-tale',
    emoji: '🏰',
    color: 'leaf',
    prompt: 'magical fairy-tale orchestra, harp, flutes, sparkly celesta, sweeping strings',
    bpm: [80, 104],
    scale: 'major',
    drumStyle: 'orchestral',
    instruments: {
      drums: 'orchestral-kit',
      bass: 'cello',
      chords: 'harp',
      pad: 'strings',
      melody: 'flute'
    }
  },
  {
    id: 'reggae',
    label: 'Reggae',
    emoji: '🌴',
    color: 'leaf',
    prompt: 'sunny reggae, offbeat guitar skank, deep bass, relaxed one-drop drums',
    bpm: [70, 90],
    scale: 'major',
    drumStyle: 'reggae',
    instruments: {
      drums: 'reggae-kit',
      bass: 'sub-bass',
      chords: 'electric-guitar',
      pad: 'organ',
      melody: 'bell-lead'
    }
  },
  {
    id: 'jazz',
    label: 'Jazz',
    emoji: '🎷',
    color: 'coral',
    prompt: 'swinging jazz trio, walking upright bass, brushed drums, jazzy piano, saxophone',
    bpm: [100, 140],
    scale: 'major',
    drumStyle: 'swing',
    instruments: {
      drums: 'brush-kit',
      bass: 'acoustic-bass',
      chords: 'piano',
      pad: 'organ',
      melody: 'sax'
    }
  },
  {
    id: 'movie',
    label: 'Movie',
    emoji: '🎬',
    color: 'sky',
    prompt: 'epic film score, big drums, soaring strings and brass, cinematic',
    bpm: [80, 110],
    scale: 'minor',
    drumStyle: 'epic',
    instruments: {
      drums: 'epic-kit',
      bass: 'cello',
      chords: 'strings',
      pad: 'choir',
      melody: 'brass'
    }
  },
  {
    id: 'kpop',
    label: 'K-pop',
    emoji: '💖',
    color: 'berry',
    prompt: 'high-energy K-pop, shiny synths, tight dance beat, playful hooks',
    bpm: [110, 130],
    scale: 'minor',
    drumStyle: 'pop',
    instruments: {
      drums: 'electro-kit',
      bass: 'synth-bass',
      chords: 'supersaw',
      pad: 'warm-pad',
      melody: 'synth-lead'
    }
  }
]

export const MOOD_INFO: Record<Mood, { emoji: string; label: string }> = {
  happy: { emoji: '😄', label: 'Happy' },
  sad: { emoji: '😢', label: 'Sad' },
  epic: { emoji: '🦸', label: 'Epic' },
  chill: { emoji: '😌', label: 'Chill' },
  silly: { emoji: '🤪', label: 'Silly' },
  dreamy: { emoji: '☁️', label: 'Dreamy' },
  spooky: { emoji: '👻', label: 'Spooky' },
  angry: { emoji: '😤', label: 'Fierce' }
}

export const SPEEDS: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: '🐌', label: 'Very slow' },
  { value: 2, emoji: '🐢', label: 'Slow' },
  { value: 3, emoji: '🐕', label: 'Medium' },
  { value: 4, emoji: '🐎', label: 'Fast' },
  { value: 5, emoji: '🐆', label: 'Super fast' }
]

export const presetById = (id: string | undefined): StylePreset | undefined =>
  STYLE_PRESETS.find((p) => p.id === id)

/** Pick a tempo inside the preset's range according to the speed choice (1–5). */
export function tempoFor(preset: StylePreset | undefined, speed: number): number {
  const [lo, hi] = preset?.bpm ?? [85, 125]
  const t = (Math.min(5, Math.max(1, speed)) - 1) / 4
  return Math.round(lo - 10 + t * (hi - lo + 20))
}
