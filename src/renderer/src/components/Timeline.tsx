import type { CSSProperties } from 'react'
import type { SectionSpan } from '@shared/music/arrange'
import { SECTION_INFO } from '@/lib/lyrics'

// Coloured blocks for each part of the song. Tap a block to jump there.
export function Timeline({
  sections,
  totalBeats,
  beat,
  onSeek
}: {
  sections: SectionSpan[]
  totalBeats: number
  beat: number
  onSeek: (beat: number) => void
}): React.JSX.Element {
  return (
    <div className="timeline">
      {sections.map((s) => {
        const info = SECTION_INFO[s.kind]
        const active = beat >= s.start && beat < s.start + s.beats
        return (
          <button
            key={s.id}
            type="button"
            className={`timeline__block${active ? ' timeline__block--on' : ''}`}
            style={
              { flexGrow: s.beats, '--sec': info.color, '--sec-soft': info.soft } as CSSProperties
            }
            onClick={() => onSeek(s.start)}
            title={info.label}
            aria-label={`Jump to ${info.label}`}
          >
            <span aria-hidden>{info.icon}</span>
          </button>
        )
      })}
      <div
        className="timeline__head"
        style={{ left: `${Math.min(100, (beat / totalBeats) * 100)}%` }}
      />
    </div>
  )
}
