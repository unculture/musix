import type { LyricSection, PartRole, PlanSection, SongPlan } from '../project'
import type { DrumSound } from './samples'
import { chordPitches, parseChord } from './theory'

// Turns a SongPlan into a flat list of timed events (in beats) for the audio engine.
// Pure and deterministic, so the same plan always sounds the same — and it's easy to test.

export interface NoteEvent {
  role: Exclude<PartRole, 'drums'>
  time: number
  duration: number
  pitches: number[]
  velocity: number
}

export interface DrumEvent {
  role: 'drums'
  time: number
  sound: DrumSound
  velocity: number
}

export type SongEvent = NoteEvent | DrumEvent

export interface SectionSpan {
  id: string
  kind: PlanSection['kind']
  start: number
  beats: number
}

export interface Arrangement {
  events: SongEvent[]
  sections: SectionSpan[]
  /** Length of the music in beats (without the release tail). */
  totalBeats: number
}

/** 16-step patterns per bar: 'x' = hit, 'o' = soft hit, '.' = rest. */
type Grid = Partial<Record<DrumSound, string>>

const DRUMS: Record<string, Grid> = {
  pop: { kick: 'x.......x.x.....', snare: '....x.......x...', hihat: 'x.x.x.x.x.x.x.x.' },
  rock: { kick: 'x.....x.x.......', snare: '....x.......x...', hihat: 'x.x.x.x.x.x.x.x.' },
  disco: { kick: 'x...x...x...x...', snare: '....x.......x...', hihat: 'o.x.o.x.o.x.o.x.' },
  hiphop: { kick: 'x......x..x.....', snare: '....x.......x...', hihat: 'x.x.x.x.x.x.x.x.' },
  house: { kick: 'x...x...x...x...', snare: '....x.......x...', hihat: '..x...x...x...x.' },
  country: { kick: 'x.......x.......', snare: '....x.......x...', hihat: 'x.o.x.o.x.o.x.o.' },
  reggae: { kick: '........x.......', snare: '........x.......', hihat: 'x.o.x.o.x.o.x.o.' },
  swing: { kick: 'x.......x.......', snare: '....o.......o...', hihat: 'x...x..xx...x..x' },
  orchestral: { kick: 'x.......x.......', tom3: 'x...........o...' },
  epic: {
    kick: 'x..x..x.x..x..x.',
    snare: '....x.......x...',
    tom3: 'x.....x.....x...',
    tom1: '..........x.x...'
  },
  none: {}
}

const FILL: Grid = { snare: '........xoxoxxxx', tom2: '........x...x...', kick: 'x.......x.......' }

/** How chords are played, per drum style. */
type Comp = 'pop' | 'eighths' | 'offbeat' | 'sustain' | 'comp' | 'arp'
const COMP: Record<string, Comp> = {
  pop: 'pop',
  rock: 'eighths',
  disco: 'offbeat',
  hiphop: 'sustain',
  house: 'offbeat',
  country: 'pop',
  reggae: 'offbeat',
  swing: 'comp',
  orchestral: 'arp',
  epic: 'sustain',
  none: 'arp'
}

type BassStyle =
  'pop' | 'eighths' | 'octaves' | 'sparse' | 'offbeat' | 'rootfifth' | 'walking' | 'whole'
const BASS: Record<string, BassStyle> = {
  pop: 'pop',
  rock: 'eighths',
  disco: 'octaves',
  hiphop: 'sparse',
  house: 'offbeat',
  country: 'rootfifth',
  reggae: 'sparse',
  swing: 'walking',
  orchestral: 'whole',
  epic: 'whole',
  none: 'whole'
}

const BASS_GRID: Partial<Record<BassStyle, string>> = {
  pop: 'x.....x.x.......',
  eighths: 'x.x.x.x.x.x.x.x.',
  octaves: 'x.o.x.o.x.o.x.o.',
  sparse: 'x......x..x.....',
  offbeat: '..x...x...x...x.'
}

const SWING_STYLES = new Set(['swing', 'hiphop'])

const hits = (grid: string): { step: number; soft: boolean }[] =>
  [...grid].flatMap((c, step) => (c === 'x' || c === 'o' ? [{ step, soft: c === 'o' }] : []))

/** Chord symbol sounding at a beat offset within a section. */
function chordAt(section: PlanSection, beat: number): string {
  let t = 0
  for (const c of section.chords) {
    if (beat < t + c.beats) return c.symbol
    t += c.beats
  }
  return section.chords[section.chords.length - 1]?.symbol ?? 'C'
}

function bassRoot(symbol: string): number {
  const chord = parseChord(symbol)
  return 36 + ((chord?.root ?? 0) % 12) // C2 … B2
}

export function arrange(plan: SongPlan): Arrangement {
  const events: SongEvent[] = []
  const sections: SectionSpan[] = []
  const bpb = plan.beatsPerBar
  const style = plan.drumStyle in DRUMS ? plan.drumStyle : 'pop'
  const swing = SWING_STYLES.has(style)
  const swingTime = (beat: number): number =>
    swing && Math.abs((beat % 1) - 0.5) < 1e-6 ? beat + 0.16 : beat
  const noDrums =
    style === 'none' || plan.parts.find((p) => p.role === 'drums')?.instrument === 'none'

  let start = 0
  plan.sections.forEach((section, si) => {
    const beats = section.bars * bpb
    sections.push({ id: section.id, kind: section.kind, start, beats })
    const next = plan.sections[si + 1]
    const energy = section.energy

    for (let bar = 0; bar < section.bars; bar++) {
      const barStart = start + bar * bpb
      const local = bar * bpb
      const isLastBar = bar === section.bars - 1

      // Drums
      if (!noDrums && energy >= 2) {
        const fill = energy >= 3 && isLastBar && next && next.energy > energy
        const grid: Grid =
          energy >= 3
            ? fill
              ? { ...DRUMS[style], ...FILL }
              : DRUMS[style]
            : { hihat: DRUMS[style].hihat }
        for (const [sound, pattern] of Object.entries(grid) as [DrumSound, string][]) {
          if (!pattern) continue
          for (const { step, soft } of hits(pattern)) {
            const beat = step / 4
            if (beat >= bpb) continue
            events.push({
              role: 'drums',
              time: barStart + swingTime(beat),
              sound,
              velocity: (soft ? 0.45 : 0.85) * (energy >= 3 ? 1 : 0.6)
            })
          }
        }
        // Crash-ish accent on the first beat of a big section.
        if (bar === 0 && energy >= 5)
          events.push({ role: 'drums', time: barStart, sound: 'tom1', velocity: 0.4 })
      }

      // Bass
      if (energy >= 2) {
        const bassStyle = BASS[style] ?? 'pop'
        const symbol = chordAt(section, local)
        const root = bassRoot(symbol)
        if (bassStyle === 'whole') {
          events.push({
            role: 'bass',
            time: barStart,
            duration: bpb * 0.95,
            pitches: [root],
            velocity: 0.75
          })
        } else if (bassStyle === 'rootfifth') {
          events.push({
            role: 'bass',
            time: barStart,
            duration: 1.8,
            pitches: [root],
            velocity: 0.8
          })
          events.push({
            role: 'bass',
            time: barStart + 2,
            duration: 1.8,
            pitches: [root + 7],
            velocity: 0.7
          })
        } else if (bassStyle === 'walking') {
          const tones = chordPitches(symbol, root)
          const nextRoot = bassRoot(chordAt(section, local + bpb))
          const walk = [
            tones[0],
            tones[1] ?? root + 4,
            tones[2] ?? root + 7,
            nextRoot + (nextRoot > root ? -1 : 1)
          ]
          walk.forEach((p, i) =>
            events.push({
              role: 'bass',
              time: barStart + i,
              duration: 0.9,
              pitches: [p],
              velocity: 0.75
            })
          )
        } else {
          for (const { step, soft } of hits(BASS_GRID[bassStyle]!)) {
            const beat = step / 4
            const pitch = bassStyle === 'octaves' && soft ? root + 12 : root
            events.push({
              role: 'bass',
              time: barStart + swingTime(beat),
              duration: 0.45,
              pitches: [pitch],
              velocity: soft ? 0.65 : 0.8
            })
          }
        }
      }

      // Chords — one or two per bar depending on the plan.
      for (let beat = 0; beat < bpb; beat += 0.5) {
        const symbol = chordAt(section, local + beat)
        const changed = beat === 0 || symbol !== chordAt(section, local + beat - 0.5)
        const voicing = chordPitches(symbol, 55)
        if (!voicing.length) continue
        const comp = COMP[style] ?? 'pop'
        const vel = 0.45 + energy * 0.06
        const push = (offset: number, duration: number, pitches = voicing, v = vel): void => {
          events.push({
            role: 'chords',
            time: barStart + swingTime(beat + offset),
            duration,
            pitches,
            velocity: v
          })
        }
        if (comp === 'sustain' || (energy <= 1 && comp !== 'arp')) {
          if (changed) push(0, remainingInChord(section, local + beat, bpb - beat) * 0.98)
        } else if (comp === 'arp') {
          const tone =
            voicing[[0, 1, 2, 1][(beat * 2) % 4] % voicing.length] + (beat % 2 === 1.5 ? 12 : 0)
          push(0, 0.9, [tone], vel * 0.9)
        } else if (comp === 'eighths') {
          push(0, 0.45, voicing.slice(0, 3), beat % 1 === 0 ? vel : vel * 0.8)
        } else if (comp === 'offbeat') {
          if (beat % 1 === 0.5) push(0, 0.3)
        } else if (comp === 'comp') {
          if (beat === 1.5 || beat === 3) push(0, 0.6)
        } else {
          // pop / country strum: 1, 2.5, 3.5 (+ 4.5 at high energy)
          if (beat === 0 || beat === 1.5 || beat === 2.5 || (energy >= 4 && beat === 3.5))
            push(0, beat === 0 ? 1.4 : 0.9)
        }
      }

      // Pad — long chords underneath when the song is big (or always for drumless styles).
      if (energy >= 4 || (noDrums && energy >= 2)) {
        const symbol = chordAt(section, local)
        events.push({
          role: 'pad',
          time: barStart,
          duration: bpb * 0.98,
          pitches: chordPitches(symbol, 60),
          velocity: 0.35 + energy * 0.05
        })
      }
    }

    // Guide melody
    for (const n of section.melody) {
      if (n.start >= beats) continue
      events.push({
        role: 'melody',
        time: start + n.start,
        duration: Math.min(n.duration, beats - n.start),
        pitches: [n.pitch],
        velocity: n.velocity
      })
    }

    start += beats
  })

  events.sort((a, b) => a.time - b.time)
  return { events, sections, totalBeats: start }
}

function remainingInChord(section: PlanSection, beat: number, maxBeats: number): number {
  let t = 0
  for (const c of section.chords) {
    if (beat < t + c.beats) return Math.min(maxBeats, t + c.beats - beat)
    t += c.beats
  }
  return maxBeats
}

// ---------------------------------------------------------------------------------------------
// Karaoke timing

export interface KaraokeWord {
  text: string
  start: number
}

export interface KaraokeLine {
  text: string
  start: number
  end: number
  kind: PlanSection['kind']
  words: KaraokeWord[]
}

/** When each lyric line (and word) is sung, in beats from the start of the song. */
export function karaokeTimeline(plan: SongPlan, lyrics: LyricSection[]): KaraokeLine[] {
  const byId = new Map(lyrics.map((s) => [s.id, s]))
  const lines: KaraokeLine[] = []
  let start = 0
  for (const section of plan.sections) {
    const beats = section.bars * plan.beatsPerBar
    const lyric = section.lyricSectionId ? byId.get(section.lyricSectionId) : undefined
    if (lyric) {
      const texts = lyric.lines.map((l) => l.text.trim()).filter(Boolean)
      const slot = beats / Math.max(1, texts.length)
      texts.forEach((text, i) => {
        const lineStart = start + i * slot
        const notes = section.melody
          .filter((n) => n.start >= i * slot - 0.01 && n.start < (i + 1) * slot - 0.01)
          .filter((n) => n.syllable !== '~')
        const words = text.split(/\s+/).filter(Boolean)
        lines.push({
          text,
          start: notes.length ? start + notes[0].start : lineStart,
          end: lineStart + slot,
          kind: section.kind,
          // Spread words over the line's notes; if the notes run out, keep them evenly spaced.
          words: words.map((w, wi) => ({
            text: w,
            start: notes[wi]
              ? start + notes[wi].start
              : lineStart + (wi / words.length) * slot * 0.85
          }))
        })
      })
    }
    start += beats
  }
  return lines
}

export const beatsToSeconds = (beats: number, bpm: number): number => (beats * 60) / bpm
