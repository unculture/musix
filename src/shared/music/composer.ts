import {
  newId,
  type LyricSection,
  type Note,
  type Part,
  type PartRole,
  type PlanSection,
  type Project,
  type SectionKind,
  SongPlan
} from '../project'
import { presetById, tempoFor, type StylePreset } from '../styles'
import { DRUM_STYLES, instrumentInfo, instrumentsFor } from './instruments'
import { MOOD_INFO } from '../styles'
import {
  chordPitches,
  diatonicChord,
  fitToVoice,
  lineSyllables,
  noteToMidi,
  pitchClass,
  SCALES,
  snapToScale,
  type KeyName,
  type ScaleName
} from './theory'
import { NOTE_NAMES, SECTION_KINDS } from '../project'

// The composer turns lyrics + style into a SongPlan. The AI does the creative part; everything it
// returns is checked and repaired here, and `fallbackPlan` can write a whole song with no AI at all.

const BEATS_PER_BAR = 4
const BARS_PER_LINE = 2
const ROLES: PartRole[] = ['drums', 'bass', 'chords', 'pad', 'melody']

const ENERGY: Record<SectionKind, number> = { intro: 2, verse: 3, chorus: 5, bridge: 3, outro: 2 }

/** Chord progressions as scale degrees (0 = I), one chord per bar. */
const PROGRESSIONS: Record<ScaleName, Record<'verse' | 'chorus' | 'bridge', number[][]>> = {
  major: {
    verse: [
      [0, 5, 3, 4],
      [0, 4, 5, 3],
      [0, 3, 0, 4]
    ],
    chorus: [
      [3, 0, 4, 5],
      [0, 4, 5, 3],
      [5, 3, 0, 4]
    ],
    bridge: [
      [5, 3, 0, 4],
      [3, 4, 2, 5]
    ]
  },
  minor: {
    verse: [
      [0, 5, 2, 6],
      [0, 3, 6, 2],
      [0, 6, 5, 6]
    ],
    chorus: [
      [5, 2, 6, 0],
      [0, 5, 2, 6],
      [3, 6, 2, 5]
    ],
    bridge: [
      [3, 4, 0, 0],
      [5, 6, 3, 4]
    ]
  }
}

/** Small deterministic PRNG so the same lyrics give the same fallback song. */
function seeded(text: string): () => number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

function progressionFor(
  kind: SectionKind,
  scale: ScaleName,
  key: KeyName,
  bars: number,
  rand: () => number
): string[] {
  const group =
    kind === 'chorus' || kind === 'intro' ? 'chorus' : kind === 'bridge' ? 'bridge' : 'verse'
  const options = PROGRESSIONS[scale][group]
  const degrees = options[Math.floor(rand() * options.length)]
  const chords = Array.from({ length: bars }, (_, i) =>
    diatonicChord(key, scale, degrees[i % degrees.length])
  )
  if (kind === 'outro') chords[chords.length - 1] = diatonicChord(key, scale, 0)
  return chords
}

const sungLines = (section: LyricSection): string[] =>
  section.lines.map((l) => l.text.trim()).filter(Boolean)

/** A simple, singable tune for one line, in beats from the start of the line's slot. */
export function fallbackLineMelody(
  line: string,
  chords: string[],
  key: KeyName,
  scale: ScaleName,
  rand: () => number,
  slotBeats = BARS_PER_LINE * BEATS_PER_BAR
): Note[] {
  const syllables = lineSyllables(line)
  if (syllables.length === 0) return []
  const usable = slotBeats - 1
  const dur =
    syllables.length * 1 <= usable - 1
      ? 1
      : syllables.length * 0.5 <= usable - 0.5
        ? 0.5
        : usable / syllables.length
  const tonic = fitToVoice(60 + pitchClass(key)!)
  const steps = SCALES[scale]
  const degreeToMidi = (d: number): number =>
    tonic + Math.floor(d / 7) * 12 + steps[((d % 7) + 7) % 7]

  let degree = rand() < 0.5 ? 2 : 4
  const notes: Note[] = []
  syllables.forEach((syllable, i) => {
    const start = i * dur
    const isLast = i === syllables.length - 1
    if (i > 0) degree += [-1, -1, 0, 1, 1, 2, -2][Math.floor(rand() * 7)]
    degree = Math.max(-2, Math.min(9, degree))
    let pitch = degreeToMidi(degree)
    // Land on a chord tone at the start of a bar and at the end of the line.
    const chord = chords[Math.min(chords.length - 1, Math.floor(start / BEATS_PER_BAR))]
    if (isLast || start % BEATS_PER_BAR === 0) pitch = nearestChordTone(pitch, chord)
    notes.push({
      pitch: fitToVoice(pitch),
      start,
      duration: isLast ? Math.max(dur, usable - start) : dur * 0.95,
      velocity: start % BEATS_PER_BAR === 0 ? 0.9 : 0.75,
      syllable
    })
  })
  return notes
}

function nearestChordTone(pitch: number, chord: string | undefined): number {
  if (!chord) return pitch
  const tones = chordPitches(chord, pitch - 12).concat(chordPitches(chord, pitch))
  return tones.reduce((best, t) => (Math.abs(t - pitch) < Math.abs(best - pitch) ? t : best), pitch)
}

function defaultParts(preset: StylePreset | undefined): Part[] {
  const fallback: Record<PartRole, string> = {
    drums: 'pop-kit',
    bass: 'synth-bass',
    chords: 'piano',
    pad: 'warm-pad',
    melody: 'bell-lead'
  }
  return ROLES.map((role) => ({
    role,
    instrument: preset?.instruments[role] ?? fallback[role],
    volume: role === 'melody' ? 0.7 : 0.8,
    muted: false
  }))
}

function pickKey(rand: () => number, scale: ScaleName): KeyName {
  // Keys that sit nicely for young voices.
  const keys: KeyName[] = scale === 'major' ? ['C', 'D', 'F', 'G', 'A'] : ['A', 'D', 'E', 'C', 'G']
  return keys[Math.floor(rand() * keys.length)]
}

function lyricOrder(lyrics: LyricSection[]): LyricSection[] {
  const sung = lyrics.filter((s) => sungLines(s).length > 0)
  const chorus = sung.find((s) => s.kind === 'chorus')
  // Songs usually end on a chorus; repeat it if hers doesn't.
  if (chorus && sung[sung.length - 1]?.kind !== 'chorus') return [...sung, chorus]
  return sung
}

function sectionFromLyrics(
  section: LyricSection,
  key: KeyName,
  scale: ScaleName,
  rand: () => number
): PlanSection {
  const lines = sungLines(section)
  const bars = Math.max(4, lines.length * BARS_PER_LINE)
  const chords = progressionFor(section.kind, scale, key, bars, rand)
  const melody = lines.flatMap((line, i) => {
    const offset = i * BARS_PER_LINE * BEATS_PER_BAR
    const lineChords = chords.slice(i * BARS_PER_LINE, (i + 1) * BARS_PER_LINE)
    return fallbackLineMelody(line, lineChords, key, scale, rand).map((n) => ({
      ...n,
      start: n.start + offset
    }))
  })
  return {
    id: newId(),
    kind: section.kind,
    bars,
    chords: chords.map((symbol) => ({ symbol, beats: BEATS_PER_BAR })),
    lyricSectionId: section.id,
    melody,
    energy: ENERGY[section.kind]
  }
}

function instrumental(
  kind: 'intro' | 'outro',
  key: KeyName,
  scale: ScaleName,
  rand: () => number
): PlanSection {
  const chords = progressionFor(kind, scale, key, 4, rand)
  return {
    id: newId(),
    kind,
    bars: 4,
    chords: chords.map((symbol) => ({ symbol, beats: BEATS_PER_BAR })),
    melody: [],
    energy: ENERGY[kind]
  }
}

/** Write a complete song with no AI. Deterministic for the same lyrics and style. */
export function fallbackPlan(project: Pick<Project, 'lyrics' | 'style'>): SongPlan {
  const preset = presetById(project.style.preset)
  const rand = seeded(JSON.stringify(project.lyrics) + JSON.stringify(project.style))
  const scale: ScaleName =
    project.style.mood === 'sad' || project.style.mood === 'spooky'
      ? 'minor'
      : project.style.mood === 'happy' || project.style.mood === 'silly'
        ? 'major'
        : (preset?.scale ?? 'major')
  const key = pickKey(rand, scale)
  const sections = [
    instrumental('intro', key, scale, rand),
    ...lyricOrder(project.lyrics).map((s) => sectionFromLyrics(s, key, scale, rand)),
    instrumental('outro', key, scale, rand)
  ]
  return SongPlan.parse({
    bpm: tempoFor(preset, project.style.speed),
    key,
    scale,
    beatsPerBar: BEATS_PER_BAR,
    drumStyle: preset?.drumStyle ?? 'pop',
    sections,
    parts: defaultParts(preset)
  })
}

// ---------------------------------------------------------------------------------------------
// AI composer

/** JSON schema for the AI's answer (OpenRouter strict structured output: everything required). */
export function composerSchema(): Record<string, unknown> {
  const roleEnum = (role: PartRole): Record<string, unknown> => ({
    type: 'string',
    enum: [...new Set(instrumentsFor(role).map((i) => i.id))]
  })
  return {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'bpm', 'key', 'scale', 'drumStyle', 'instruments', 'sections'],
    properties: {
      title: { type: 'string', description: 'A short, fun song title based on the lyrics' },
      bpm: { type: 'integer' },
      key: { type: 'string', enum: [...NOTE_NAMES] },
      scale: { type: 'string', enum: ['major', 'minor'] },
      drumStyle: { type: 'string', enum: [...DRUM_STYLES] },
      instruments: {
        type: 'object',
        additionalProperties: false,
        required: ROLES,
        properties: Object.fromEntries(ROLES.map((r) => [r, roleEnum(r)]))
      },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['kind', 'lyricSectionId', 'bars', 'energy', 'chords', 'lines'],
          properties: {
            kind: { type: 'string', enum: [...SECTION_KINDS] },
            lyricSectionId: {
              type: 'string',
              description: "id of the lyric section sung here, or '' for instrumental"
            },
            bars: { type: 'integer' },
            energy: { type: 'integer', description: '1 (quiet) to 5 (full band)' },
            chords: {
              type: 'array',
              items: { type: 'string' },
              description: 'One chord symbol per bar, e.g. C, Am, F, G7'
            },
            lines: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['lineId', 'notes'],
                properties: {
                  lineId: { type: 'string' },
                  notes: {
                    type: 'array',
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      required: ['syllable', 'pitch', 'beats'],
                      properties: {
                        syllable: {
                          type: 'string',
                          description: "The syllable sung, '~' to hold the previous word, or 'rest'"
                        },
                        pitch: {
                          type: 'string',
                          description: "Scientific pitch like E4, or 'rest'"
                        },
                        beats: { type: 'number' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

export function composerMessages(
  project: Pick<Project, 'lyrics' | 'style' | 'hum' | 'title'>
): { role: 'system' | 'user'; content: string }[] {
  const preset = presetById(project.style.preset)
  const mood = project.style.mood ? MOOD_INFO[project.style.mood].label : 'any'
  const lyrics = project.lyrics
    .filter((s) => sungLines(s).length)
    .map(
      (s) =>
        `[${s.kind} id=${s.id}]\n${s.lines
          .filter((l) => l.text.trim())
          .map((l) => `(lineId=${l.id}) ${l.text.trim()}`)
          .join('\n')}`
    )
    .join('\n\n')
  const hum = project.hum?.notes.length
    ? `\nShe hummed this tune — base the chorus melody on it (MIDI pitch@beat:length): ${project.hum.notes
        .slice(0, 48)
        .map((n) => `${n.pitch}@${n.start}:${n.duration}`)
        .join(' ')}`
    : ''

  return [
    {
      role: 'system',
      content: [
        'You are a friendly songwriter helping an 11-year-old turn her lyrics into a song she will sing along to.',
        'Write a song plan: tempo, key, sections in play order, one chord per bar, and a singable melody for every lyric line.',
        'Rules:',
        '- Use ALL of her lyric sections, in her order. Never change her words. You may repeat a chorus. Add a short intro (2-4 bars) and outro (2-4 bars).',
        '- Each lyric line normally gets 2 bars (8 beats); a section with N lines has 2N bars. Lines may be fitted to 1 or 4 bars if very short or long.',
        "- Melody: one note per syllable. Split multi-syllable words: first note gets the word, extra syllables are '~'. Note beats should add up to at most the line's length; end lines with a longer note and leave a small breath.",
        '- Keep the melody between A3 and E5, mostly stepwise with a few leaps, catchy and repetitive. Make the chorus the most memorable and a little higher.',
        '- Every pitch must be in the key. Chords should be simple, mostly diatonic (I, IV, V, vi …).',
        '- For instrumental sections, use lyricSectionId "" and no lines.',
        '- Match the style and mood. Pick instruments and drumStyle from the allowed lists.'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        `Style: ${preset ? `${preset.label} — ${preset.prompt}` : 'her choice below'}`,
        project.style.description.trim()
          ? `In her words: "${project.style.description.trim()}"`
          : '',
        `Mood: ${mood}. Speed: ${project.style.speed}/5 (about ${tempoFor(preset, project.style.speed)} bpm).`,
        `Current title: ${project.title}`,
        hum,
        '',
        'Lyrics:',
        lyrics
      ]
        .filter((l) => l !== '')
        .join('\n')
    }
  ]
}

interface AiNote {
  syllable: string
  pitch: string
  beats: number
}
interface AiSection {
  kind: SectionKind
  lyricSectionId: string
  bars: number
  energy: number
  chords: string[]
  lines: { lineId: string; notes: AiNote[] }[]
}
export interface AiPlan {
  title: string
  bpm: number
  key: KeyName
  scale: ScaleName
  drumStyle: string
  instruments: Record<PartRole, string>
  sections: AiSection[]
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))
const quantize = (n: number, step = 0.25): number => Math.round(n / step) * step

/** Turn one AI line into notes within `slotBeats`, squashing it if it runs long. */
function normaliseLine(notes: AiNote[], key: KeyName, scale: ScaleName, slotBeats: number): Note[] {
  const total = notes.reduce((t, n) => t + Math.max(0.25, Number(n.beats) || 0.5), 0)
  const scaleBy = total > slotBeats - 0.5 ? (slotBeats - 0.5) / total : 1
  const out: Note[] = []
  let t = 0
  for (const n of notes) {
    const beats = Math.max(0.25, quantize(Math.max(0.25, Number(n.beats) || 0.5) * scaleBy))
    const midi = noteToMidi(n.pitch)
    const pitch = midi === null ? null : fitToVoice(snapToScale(midi, key, scale))
    const prev = out[out.length - 1]
    if (
      pitch !== null &&
      n.syllable === '~' &&
      prev?.pitch === pitch &&
      prev.start + prev.duration >= t - 0.1
    ) {
      // '~' on the same pitch means "hold the last note", not a new one.
      prev.duration = t + beats * 0.95 - prev.start
    } else if (pitch !== null && n.syllable !== 'rest') {
      out.push({
        pitch,
        start: quantize(t),
        duration: beats * 0.95,
        velocity: 0.8,
        syllable: n.syllable || '~'
      })
    }
    t += beats
  }
  return out
}

/** Check and repair the AI's plan. Anything missing or broken is filled in from the fallback composer. */
export function normaliseAiPlan(
  ai: AiPlan,
  project: Pick<Project, 'lyrics' | 'style'>
): { plan: SongPlan; title: string } {
  const preset = presetById(project.style.preset)
  const rand = seeded(JSON.stringify(project.lyrics))
  const key: KeyName = (NOTE_NAMES as readonly string[]).includes(ai.key) ? ai.key : 'C'
  const scale: ScaleName = ai.scale === 'minor' ? 'minor' : 'major'
  const lyricsById = new Map(project.lyrics.map((s) => [s.id, s]))

  const sections: PlanSection[] = []
  for (const s of ai.sections ?? []) {
    const kind: SectionKind = (SECTION_KINDS as readonly string[]).includes(s.kind)
      ? s.kind
      : 'verse'
    const lyric = s.lyricSectionId ? lyricsById.get(s.lyricSectionId) : undefined
    const lines = lyric ? sungLines(lyric) : []
    let bars = clamp(Math.round(Number(s.bars) || 4), 1, 32)
    if (lyric && bars < lines.length) bars = lines.length * BARS_PER_LINE

    const fallbackChords = progressionFor(kind, scale, key, bars, rand)
    const chords = Array.from({ length: bars }, (_, i) => {
      const c = s.chords?.[i % Math.max(1, s.chords?.length ?? 0)]
      return c && chordPitches(c).length ? c : fallbackChords[i]
    })

    let melody: Note[] = []
    if (lyric) {
      const slotBars = Math.max(1, Math.floor(bars / lines.length))
      const slot = slotBars * BEATS_PER_BAR
      const aiLines = new Map((s.lines ?? []).map((l) => [l.lineId, l.notes]))
      const lyricLines = lyric.lines.filter((l) => l.text.trim())
      melody = lyricLines.flatMap((line, i) => {
        const offset = i * slot
        const aiNotes = aiLines.get(line.id) ?? s.lines?.[i]?.notes
        const notes = aiNotes?.length
          ? normaliseLine(aiNotes, key, scale, slot)
          : fallbackLineMelody(
              line.text,
              chords.slice(i * slotBars, (i + 1) * slotBars),
              key,
              scale,
              rand,
              slot
            )
        return notes.map((n) => ({ ...n, start: n.start + offset }))
      })
    }

    sections.push({
      id: newId(),
      kind,
      bars,
      chords: chords.map((symbol) => ({ symbol, beats: BEATS_PER_BAR })),
      lyricSectionId: lyric?.id,
      melody,
      energy: clamp(Math.round(Number(s.energy) || ENERGY[kind]), 1, 5)
    })
  }

  // Make sure every lyric section she wrote is actually sung.
  const sungIds = new Set(sections.map((s) => s.lyricSectionId).filter(Boolean))
  for (const lyric of project.lyrics) {
    if (sungLines(lyric).length && !sungIds.has(lyric.id)) {
      const outroAt = sections.findIndex((s) => s.kind === 'outro')
      sections.splice(
        outroAt >= 0 ? outroAt : sections.length,
        0,
        sectionFromLyrics(lyric, key, scale, rand)
      )
    }
  }
  if (!sections.some((s) => s.kind === 'intro'))
    sections.unshift(instrumental('intro', key, scale, rand))
  if (!sections.some((s) => s.kind === 'outro'))
    sections.push(instrumental('outro', key, scale, rand))

  const parts = defaultParts(preset).map((p) => {
    const chosen = ai.instruments?.[p.role]
    return chosen && instrumentInfo(p.role, chosen) ? { ...p, instrument: chosen } : p
  })

  const plan = SongPlan.parse({
    bpm: clamp(Math.round(Number(ai.bpm) || tempoFor(preset, project.style.speed)), 60, 180),
    key,
    scale,
    beatsPerBar: BEATS_PER_BAR,
    drumStyle: (DRUM_STYLES as readonly string[]).includes(ai.drumStyle)
      ? ai.drumStyle
      : (preset?.drumStyle ?? 'pop'),
    sections,
    parts
  })
  return { plan, title: (ai.title ?? '').trim().slice(0, 60) }
}
