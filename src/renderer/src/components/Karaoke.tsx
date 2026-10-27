import { useMemo, type CSSProperties } from 'react'
import type { LyricSection, SongPlan } from '@shared/project'
import { karaokeTimeline } from '@shared/music/arrange'
import { SECTION_INFO } from '@/lib/lyrics'

// Big, calm karaoke: the line being sung in large text, words lighting up as they're sung,
// with the next line waiting underneath so she can read ahead.
export function Karaoke({
  plan,
  lyrics,
  beat
}: {
  plan: SongPlan
  lyrics: LyricSection[]
  beat: number
}): React.JSX.Element {
  const lines = useMemo(() => karaokeTimeline(plan, lyrics), [plan, lyrics])
  // The current line is the last one that has started (with a little lead-in so she can get ready).
  const lead = 1.5
  let index = -1
  for (let i = 0; i < lines.length; i++) if (lines[i].start - lead <= beat) index = i
  const current = lines[index]
  const next = lines[index + 1] ?? (index === -1 ? lines[0] : undefined)
  const info = current ? SECTION_INFO[current.kind] : null
  const singing = current && beat < current.end + 0.5

  return (
    <div className="karaoke" style={{ '--sec': info?.color ?? 'var(--leaf)' } as CSSProperties}>
      {info && singing && (
        <div className="karaoke__section">
          {info.icon} {info.label}
        </div>
      )}
      <p className="karaoke__line">
        {current && singing ? (
          current.words.map((w, i) => (
            <span
              key={i}
              className={beat >= w.start ? 'karaoke__word karaoke__word--sung' : 'karaoke__word'}
            >
              {w.text}{' '}
            </span>
          ))
        ) : (
          <span className="karaoke__rest">🎶</span>
        )}
      </p>
      <p className="karaoke__next">{next?.text ?? ''}</p>
    </div>
  )
}
