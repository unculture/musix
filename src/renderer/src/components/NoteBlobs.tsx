import type { Note } from '@shared/project'

// A tiny, colourful picture of a tune: higher notes sit higher, longer notes are wider.
const COLORS = [
  'var(--berry)',
  'var(--sun)',
  'var(--sky)',
  'var(--leaf)',
  'var(--grape)',
  'var(--coral)'
]

export function NoteBlobs({
  notes,
  activeBeat
}: {
  notes: Note[]
  activeBeat?: number
}): React.JSX.Element {
  if (!notes.length) return <div className="note-blobs note-blobs--empty" />
  const end = Math.max(...notes.map((n) => n.start + n.duration))
  const lo = Math.min(...notes.map((n) => n.pitch)) - 1
  const hi = Math.max(...notes.map((n) => n.pitch)) + 1
  return (
    <div className="note-blobs" aria-hidden>
      {notes.map((n, i) => (
        <span
          key={i}
          className={`note-blobs__note${activeBeat !== undefined && activeBeat >= n.start && activeBeat < n.start + n.duration ? ' note-blobs__note--on' : ''}`}
          style={{
            left: `${(n.start / end) * 100}%`,
            width: `${Math.max(1.5, (n.duration / end) * 100 - 0.6)}%`,
            bottom: `${((n.pitch - lo) / (hi - lo)) * 80}%`,
            background: COLORS[n.pitch % COLORS.length]
          }}
        />
      ))}
    </div>
  )
}
