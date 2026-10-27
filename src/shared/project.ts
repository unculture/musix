import { z } from 'zod'

// The Musix project format. Everything a song needs lives here; audio files sit next to it.
// Bump PROJECT_VERSION and add a migration in `parseProject` when the shape changes.
export const PROJECT_VERSION = 1

export const SECTION_KINDS = ['intro', 'verse', 'chorus', 'bridge', 'outro'] as const
export const SectionKind = z.enum(SECTION_KINDS)
export type SectionKind = z.infer<typeof SectionKind>

export const LyricLine = z.object({ id: z.string(), text: z.string() })
export type LyricLine = z.infer<typeof LyricLine>

export const LyricSection = z.object({
  id: z.string(),
  kind: SectionKind,
  lines: z.array(LyricLine)
})
export type LyricSection = z.infer<typeof LyricSection>

export const MOODS = [
  'happy',
  'sad',
  'epic',
  'chill',
  'silly',
  'dreamy',
  'spooky',
  'angry'
] as const
export const Mood = z.enum(MOODS)
export type Mood = z.infer<typeof Mood>

export const StyleChoice = z.object({
  /** id of a preset style card, e.g. 'pop'. */
  preset: z.string().optional(),
  /** Her own description, typed or spoken. */
  description: z.string().default(''),
  mood: Mood.optional(),
  /** 1 (slow 🐢) … 5 (fast 🐇). */
  speed: z.number().min(1).max(5).default(3)
})
export type StyleChoice = z.infer<typeof StyleChoice>

/** A note in beats, relative to the start of its section (or take). */
export const Note = z.object({
  pitch: z.number().int().min(0).max(127),
  start: z.number().min(0),
  duration: z.number().positive(),
  velocity: z.number().min(0).max(1).default(0.8),
  /** Syllable sung on this note, for karaoke. */
  syllable: z.string().optional()
})
export type Note = z.infer<typeof Note>

export const HumTake = z.object({
  file: z.string(),
  notes: z.array(Note),
  bpm: z.number().optional()
})
export type HumTake = z.infer<typeof HumTake>

export const ChordSlot = z.object({
  /** Chord symbol, e.g. 'C', 'Am', 'F', 'G7', 'Bb'. */
  symbol: z.string(),
  beats: z.number().positive()
})
export type ChordSlot = z.infer<typeof ChordSlot>

export const PlanSection = z.object({
  id: z.string(),
  kind: SectionKind,
  bars: z.number().int().positive(),
  chords: z.array(ChordSlot),
  /** The lyric section sung here, if any. */
  lyricSectionId: z.string().optional(),
  melody: z.array(Note).default([]),
  /** 1 (quiet) … 5 (everything playing). */
  energy: z.number().min(1).max(5).default(3)
})
export type PlanSection = z.infer<typeof PlanSection>

export const PART_ROLES = ['drums', 'bass', 'chords', 'pad', 'melody'] as const
export const PartRole = z.enum(PART_ROLES)
export type PartRole = z.infer<typeof PartRole>

export const Part = z.object({
  role: PartRole,
  /** Instrument id from the engine's catalogue, e.g. 'piano', 'synth-bass'. */
  instrument: z.string(),
  volume: z.number().min(0).max(1).default(0.8),
  muted: z.boolean().default(false)
})
export type Part = z.infer<typeof Part>

export const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const

export const SongPlan = z.object({
  bpm: z.number().min(50).max(200),
  key: z.enum(NOTE_NAMES),
  scale: z.enum(['major', 'minor']),
  beatsPerBar: z.number().int().default(4),
  drumStyle: z.string(),
  /** Sections in play order (a chorus that repeats appears more than once). */
  sections: z.array(PlanSection),
  parts: z.array(Part)
})
export type SongPlan = z.infer<typeof SongPlan>

export const AudioLayer = z.object({
  id: z.string(),
  kind: z.enum(['ai', 'vocal']),
  name: z.string(),
  /** File name inside the project's audio folder. */
  file: z.string(),
  /** Seconds from song start. */
  offset: z.number().default(0),
  volume: z.number().min(0).max(1).default(0.8),
  muted: z.boolean().default(false)
})
export type AudioLayer = z.infer<typeof AudioLayer>

export const Project = z.object({
  version: z.literal(PROJECT_VERSION),
  id: z.string(),
  title: z.string(),
  emoji: z.string(),
  color: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lyrics: z.array(LyricSection),
  style: StyleChoice,
  hum: HumTake.optional(),
  plan: SongPlan.optional(),
  layers: z.array(AudioLayer).default([])
})
export type Project = z.infer<typeof Project>

export interface ProjectSummary {
  id: string
  title: string
  emoji: string
  color: string
  updatedAt: string
  hasSong: boolean
}

export function summarise(p: Project): ProjectSummary {
  return {
    id: p.id,
    title: p.title,
    emoji: p.emoji,
    color: p.color,
    updatedAt: p.updatedAt,
    hasSong: Boolean(p.plan)
  }
}

export function parseProject(data: unknown): Project {
  return Project.parse(data)
}

const EMOJIS = [
  '🌈',
  '🦄',
  '🚀',
  '🌊',
  '🐉',
  '🌸',
  '⭐',
  '🍓',
  '🐱',
  '🦋',
  '🌙',
  '🔥',
  '🍩',
  '🎈',
  '🐬',
  '🌻'
]
const COLORS = ['berry', 'sun', 'sky', 'leaf', 'grape', 'coral']

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export function createProject(now = new Date()): Project {
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]
  const stamp = now.toISOString()
  return {
    version: PROJECT_VERSION,
    id: newId(),
    title: 'My new song',
    emoji: pick(EMOJIS),
    color: pick(COLORS),
    createdAt: stamp,
    updatedAt: stamp,
    lyrics: [],
    style: { description: '', speed: 3 },
    layers: []
  }
}
