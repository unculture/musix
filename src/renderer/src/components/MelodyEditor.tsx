import { useState, type CSSProperties } from 'react'
import * as Tone from 'tone'
import type { SongPlan } from '@shared/project'
import {
  addNote,
  deleteNote,
  melodyRows,
  resizeNote,
  shiftNote,
  stepNote
} from '@shared/music/edit'
import { createPitchedVoice } from '@/audio/voices'
import { SECTION_INFO } from '@/lib/lyrics'

// A chunky, tap-only piano roll. Rows are only the notes in the song's key.
const COLORS = [
  'var(--berry)',
  'var(--sun)',
  'var(--sky)',
  'var(--leaf)',
  'var(--grape)',
  'var(--coral)',
  'var(--berry)'
]
const CELL_W = 40
const CELL_H = 36

async function hear(plan: SongPlan, si: number): Promise<void> {
  await Tone.start()
  const part = plan.parts.find((p) => p.role === 'melody')
  const voice = createPitchedVoice(part?.instrument ?? 'piano') ?? createPitchedVoice('piano')
  if (!voice) return
  voice.output.toDestination()
  await Tone.loaded()
  const spb = 60 / plan.bpm
  const now = Tone.now() + 0.1
  const notes = plan.sections[si].melody
  for (const n of notes) voice.play([n.pitch], now + n.start * spb, n.duration * spb, n.velocity)
  const end = Math.max(1, ...notes.map((n) => n.start + n.duration)) * spb
  setTimeout(() => voice.dispose(), (end + 2) * 1000)
}

export function MelodyEditor({
  plan,
  section: si,
  edit
}: {
  plan: SongPlan
  section: number
  edit: (fn: (p: SongPlan) => SongPlan) => void
}): React.JSX.Element {
  const [selected, setSelected] = useState<number | null>(null)
  const section = plan.sections[si]
  const rows = [...melodyRows(plan)].reverse()
  const beats = section.bars * plan.beatsPerBar
  const cols = beats * 2
  const info = SECTION_INFO[section.kind]
  const rowOf = (pitch: number): number =>
    rows.reduce((best, r, i) => (Math.abs(r - pitch) < Math.abs(rows[best] - pitch) ? i : best), 0)
  const note = selected !== null ? section.melody[selected] : undefined

  const editNote = (fn: (p: SongPlan) => SongPlan): void => {
    if (note) edit(fn)
  }

  return (
    <div className="melody">
      <div className="melody__bar">
        <span className="parts__heading">
          {info.icon} {info.label}
        </span>
        <button type="button" className="chip" onClick={() => hear(plan, si)}>
          🔊 Hear this part
        </button>
        {note ? (
          <>
            <button
              type="button"
              className="chip"
              aria-label="Higher"
              onClick={() => editNote((p) => stepNote(p, si, selected!, 1))}
            >
              ⬆️
            </button>
            <button
              type="button"
              className="chip"
              aria-label="Lower"
              onClick={() => editNote((p) => stepNote(p, si, selected!, -1))}
            >
              ⬇️
            </button>
            <button
              type="button"
              className="chip"
              aria-label="Earlier"
              onClick={() => editNote((p) => shiftNote(p, si, selected!, -0.5))}
            >
              ⬅️
            </button>
            <button
              type="button"
              className="chip"
              aria-label="Later"
              onClick={() => editNote((p) => shiftNote(p, si, selected!, 0.5))}
            >
              ➡️
            </button>
            <button
              type="button"
              className="chip"
              aria-label="Shorter"
              onClick={() => editNote((p) => resizeNote(p, si, selected!, -0.5))}
            >
              ➖
            </button>
            <button
              type="button"
              className="chip"
              aria-label="Longer"
              onClick={() => editNote((p) => resizeNote(p, si, selected!, 0.5))}
            >
              ➕
            </button>
            <button
              type="button"
              className="chip"
              aria-label="Bin this note"
              onClick={() => {
                edit((p) => deleteNote(p, si, selected!))
                setSelected(null)
              }}
            >
              🗑️
            </button>
          </>
        ) : (
          <span className="melody__hint">Tap a note to change it, or tap a space to add one.</span>
        )}
      </div>
      <div className="melody__scroll">
        <div
          className="melody__grid"
          style={{ width: cols * CELL_W, height: rows.length * CELL_H }}
        >
          {Array.from({ length: cols }, (_, c) =>
            rows.map((pitch, r) => (
              <button
                key={`${c}-${r}`}
                type="button"
                className={`melody__cell${c % 8 === 0 ? ' melody__cell--bar' : ''}`}
                style={{ left: c * CELL_W, top: r * CELL_H, width: CELL_W, height: CELL_H }}
                aria-label="Add a note here"
                onClick={() => {
                  edit((p) => addNote(p, si, c / 2, pitch, 1))
                  setSelected(null)
                }}
              />
            ))
          )}
          {section.melody.map((n, i) => (
            <button
              key={i}
              type="button"
              className={`melody__note${selected === i ? ' melody__note--on' : ''}`}
              style={
                {
                  left: n.start * 2 * CELL_W + 2,
                  top: rowOf(n.pitch) * CELL_H + 3,
                  width: Math.max(CELL_W, n.duration * 2 * CELL_W) - 4,
                  height: CELL_H - 6,
                  '--note': COLORS[rowOf(n.pitch) % COLORS.length]
                } as CSSProperties
              }
              onClick={() => setSelected(selected === i ? null : i)}
              aria-label={n.syllable && n.syllable !== '~' ? `Note for ${n.syllable}` : 'Note'}
            >
              {n.syllable && n.syllable !== '~' ? n.syllable : ''}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
