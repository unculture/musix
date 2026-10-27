import {
  newId,
  type Note,
  type PartRole,
  type PlanSection,
  type SectionKind,
  type SongPlan
} from '../project'
import {
  diatonicChord,
  inScale,
  mod12,
  parseChord,
  pcName,
  pitchClass,
  VOICE_HIGH,
  VOICE_LOW
} from './theory'

// Small, safe edits to a SongPlan. Each returns a new plan, so they slot straight into undo.

export const MIN_BPM = 60
export const MAX_BPM = 180

export function setTempo(plan: SongPlan, bpm: number): SongPlan {
  return { ...plan, bpm: Math.round(Math.min(MAX_BPM, Math.max(MIN_BPM, bpm))) }
}

export function transposeChord(symbol: string, semitones: number): string {
  const m = symbol.match(/^([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?$/)
  if (!m || pitchClass(m[1]) === null) return symbol
  const bass = m[3] ? `/${pcName(pitchClass(m[3])! + semitones)}` : ''
  return `${pcName(pitchClass(m[1])! + semitones)}${m[2]}${bass}`
}

/** How far the tune can move before it leaves a comfortable singing range. */
export function transposeLimits(plan: SongPlan): { down: number; up: number } {
  const pitches = plan.sections.flatMap((s) => s.melody.map((n) => n.pitch))
  if (!pitches.length) return { down: 6, up: 6 }
  return {
    down: Math.max(0, Math.min(6, Math.min(...pitches) - (VOICE_LOW - 3))),
    up: Math.max(0, Math.min(6, VOICE_HIGH + 3 - Math.max(...pitches)))
  }
}

/** Move the whole song higher or lower. */
export function transpose(plan: SongPlan, semitones: number): SongPlan {
  if (!semitones) return plan
  return {
    ...plan,
    key: pcName(pitchClass(plan.key)! + semitones),
    sections: plan.sections.map((s) => ({
      ...s,
      chords: s.chords.map((c) => ({ ...c, symbol: transposeChord(c.symbol, semitones) })),
      melody: s.melody.map((n) => ({ ...n, pitch: n.pitch + semitones }))
    }))
  }
}

export function setInstrument(plan: SongPlan, role: PartRole, instrument: string): SongPlan {
  return { ...plan, parts: plan.parts.map((p) => (p.role === role ? { ...p, instrument } : p)) }
}

export function setPartMix(
  plan: SongPlan,
  role: PartRole,
  mix: { volume?: number; muted?: boolean }
): SongPlan {
  return { ...plan, parts: plan.parts.map((p) => (p.role === role ? { ...p, ...mix } : p)) }
}

export function moveSection(plan: SongPlan, index: number, to: number): SongPlan {
  if (to < 0 || to >= plan.sections.length || to === index) return plan
  const sections = [...plan.sections]
  const [s] = sections.splice(index, 1)
  sections.splice(to, 0, s)
  return { ...plan, sections }
}

export function duplicateSection(plan: SongPlan, index: number): SongPlan {
  const s = plan.sections[index]
  if (!s) return plan
  const sections = [...plan.sections]
  sections.splice(index + 1, 0, {
    ...s,
    id: newId(),
    chords: s.chords.map((c) => ({ ...c })),
    melody: s.melody.map((n) => ({ ...n }))
  })
  return { ...plan, sections }
}

export function deleteSection(plan: SongPlan, index: number): SongPlan {
  if (plan.sections.length <= 1) return plan
  return { ...plan, sections: plan.sections.filter((_, i) => i !== index) }
}

export function updateSection(
  plan: SongPlan,
  index: number,
  change: Partial<PlanSection>
): SongPlan {
  return { ...plan, sections: plan.sections.map((s, i) => (i === index ? { ...s, ...change } : s)) }
}

export function setChord(
  plan: SongPlan,
  sectionIndex: number,
  chordIndex: number,
  symbol: string
): SongPlan {
  const s = plan.sections[sectionIndex]
  if (!s || !parseChord(symbol)) return plan
  return updateSection(plan, sectionIndex, {
    chords: s.chords.map((c, i) => (i === chordIndex ? { ...c, symbol } : c))
  })
}

/** Add an instrumental part (intro, solo, outro…) with chords from the key. */
export function addInstrumental(
  plan: SongPlan,
  at: number,
  kind: SectionKind = 'bridge',
  bars = 4
): SongPlan {
  const degrees = plan.scale === 'major' ? [3, 4, 5, 4] : [5, 6, 3, 4]
  const section: PlanSection = {
    id: newId(),
    kind,
    bars,
    chords: Array.from({ length: bars }, (_, i) => ({
      symbol: diatonicChord(plan.key, plan.scale, degrees[i % degrees.length]),
      beats: plan.beatsPerBar
    })),
    melody: [],
    energy: 4
  }
  const sections = [...plan.sections]
  sections.splice(Math.max(0, Math.min(at, sections.length)), 0, section)
  return { ...plan, sections }
}

/** Friendly chord choices for this song: the chords that belong to its key. */
export function chordChoices(plan: SongPlan): string[] {
  return [0, 1, 2, 3, 4, 5, 6]
    .map((d) => diatonicChord(plan.key, plan.scale, d))
    .filter((c) => !c.endsWith('dim'))
}

/** Pick a different chord from the key at random (for "surprise me"). */
export function surpriseChord(plan: SongPlan, current: string, rand = Math.random): string {
  const options = chordChoices(plan).filter((c) => c !== current)
  return options[Math.floor(rand() * options.length)] ?? current
}

export const keyLabel = (plan: SongPlan): string => `${plan.key} ${plan.scale}`
export const semitoneName = (n: number): string => pcName(mod12(n))

// ---------------------------------------------------------------------------------------------
// Melody editing — notes always stay in the key, so whatever she does sounds good.

/** Scale notes in a comfortable singing range, low to high. */
export function melodyRows(plan: SongPlan): number[] {
  const rows: number[] = []
  for (let m = VOICE_LOW - 2; m <= VOICE_HIGH + 2; m++)
    if (inScale(m, plan.key, plan.scale)) rows.push(m)
  return rows
}

function editMelody(plan: SongPlan, si: number, fn: (notes: Note[]) => Note[]): SongPlan {
  const s = plan.sections[si]
  if (!s) return plan
  const beats = s.bars * plan.beatsPerBar
  const notes = fn(s.melody.map((n) => ({ ...n })))
    .filter((n) => n.start >= 0 && n.start < beats)
    .map((n) => ({ ...n, duration: Math.min(n.duration, beats - n.start) }))
    .sort((a, b) => a.start - b.start)
  return updateSection(plan, si, { melody: notes })
}

/** Move a note up or down by scale steps. */
export function stepNote(plan: SongPlan, si: number, ni: number, steps: number): SongPlan {
  const rows = melodyRows(plan)
  return editMelody(plan, si, (notes) => {
    const n = notes[ni]
    if (!n) return notes
    const at = rows.reduce(
      (best, r, i) => (Math.abs(r - n.pitch) < Math.abs(rows[best] - n.pitch) ? i : best),
      0
    )
    n.pitch = rows[Math.max(0, Math.min(rows.length - 1, at + steps))]
    return notes
  })
}

export function shiftNote(plan: SongPlan, si: number, ni: number, beats: number): SongPlan {
  return editMelody(plan, si, (notes) => {
    if (notes[ni]) notes[ni].start = Math.max(0, notes[ni].start + beats)
    return notes
  })
}

export function resizeNote(plan: SongPlan, si: number, ni: number, beats: number): SongPlan {
  return editMelody(plan, si, (notes) => {
    if (notes[ni]) notes[ni].duration = Math.max(0.5, notes[ni].duration + beats)
    return notes
  })
}

export function deleteNote(plan: SongPlan, si: number, ni: number): SongPlan {
  return editMelody(plan, si, (notes) => notes.filter((_, i) => i !== ni))
}

export function addNote(
  plan: SongPlan,
  si: number,
  start: number,
  pitch: number,
  duration = 1
): SongPlan {
  return editMelody(plan, si, (notes) => [
    ...notes.filter((n) => n.start !== start),
    { pitch, start, duration, velocity: 0.8, syllable: '~' }
  ])
}
