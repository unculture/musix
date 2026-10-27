import { useEffect, type CSSProperties } from 'react'
import type { LyricSection, SectionKind } from '@shared/project'
import { BigButton } from '@/components/BigButton'
import { MicButton } from '@/components/MicButton'
import { SpeakButton } from '@/components/Speakable'
import { StepScreen } from '@/components/StepScreen'
import {
  appendText,
  hasWords,
  linesToText,
  moveItem,
  newSection,
  SECTION_INFO,
  textToLines
} from '@/lib/lyrics'
import { useProject } from '@/state/project'

const ADDABLE: SectionKind[] = ['verse', 'chorus', 'bridge']
const LYRIC_HINT = 'These are song lyrics.'

function SectionCard({
  section,
  index,
  count,
  onChange,
  onMove,
  onDelete
}: {
  section: LyricSection
  index: number
  count: number
  onChange: (s: LyricSection) => void
  onMove: (to: number) => void
  onDelete: () => void
}): React.JSX.Element {
  const info = SECTION_INFO[section.kind]
  const text = linesToText(section.lines)
  const setText = (t: string): void =>
    onChange({ ...section, lines: textToLines(t, section.lines) })

  return (
    <div
      className="lyric-card"
      style={{ '--sec': info.color, '--sec-soft': info.soft } as CSSProperties}
    >
      <div className="lyric-card__head">
        <select
          className="lyric-card__kind"
          value={section.kind}
          onChange={(e) => onChange({ ...section, kind: e.target.value as SectionKind })}
          aria-label="What kind of part is this?"
        >
          {(Object.keys(SECTION_INFO) as SectionKind[]).map((k) => (
            <option key={k} value={k}>
              {SECTION_INFO[k].icon} {SECTION_INFO[k].label}
            </option>
          ))}
        </select>
        <div className="lyric-card__tools">
          <SpeakButton text={text || `Empty ${info.label}`} size="sm" />
          <button
            type="button"
            aria-label="Move up"
            title="Move up"
            disabled={index === 0}
            onClick={() => onMove(index - 1)}
          >
            ⬆️
          </button>
          <button
            type="button"
            aria-label="Move down"
            title="Move down"
            disabled={index === count - 1}
            onClick={() => onMove(index + 1)}
          >
            ⬇️
          </button>
          <button type="button" aria-label="Bin this part" title="Bin this part" onClick={onDelete}>
            🗑️
          </button>
        </div>
      </div>
      <textarea
        className="lyric-card__text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type here, or press Say it…"
        rows={Math.max(3, section.lines.length + 1)}
        spellCheck
      />
      <div className="lyric-card__foot">
        <MicButton onText={(said) => setText(appendText(text, said))} hint={LYRIC_HINT} />
      </div>
    </div>
  )
}

export function WordsScreen(): React.JSX.Element {
  const project = useProject((s) => s.project)!
  const update = useProject((s) => s.update)
  const sections = project.lyrics

  // A new song starts with an empty verse so there's somewhere to begin.
  useEffect(() => {
    if (sections.length === 0) update((p) => ({ ...p, lyrics: [newSection('verse')] }))
  }, [sections.length, update])

  const setSections = (lyrics: LyricSection[]): void => update((p) => ({ ...p, lyrics }))

  return (
    <StepScreen
      step="words"
      title="Your words"
      help="Type or say the words of your song. Each coloured box is one part of your song."
      nextDisabled={!hasWords(sections)}
    >
      <div className="lyrics">
        {sections.map((s, i) => (
          <SectionCard
            key={s.id}
            section={s}
            index={i}
            count={sections.length}
            onChange={(next) => setSections(sections.map((x) => (x.id === s.id ? next : x)))}
            onMove={(to) => setSections(moveItem(sections, i, to))}
            onDelete={() => setSections(sections.filter((x) => x.id !== s.id))}
          />
        ))}
        <div className="lyrics__add">
          {ADDABLE.map((kind) => (
            <BigButton
              key={kind}
              icon={SECTION_INFO[kind].icon}
              label={`Add ${SECTION_INFO[kind].label.toLowerCase()}`}
              variant="soft"
              color={SECTION_INFO[kind].color}
              onClick={() => setSections([...sections, newSection(kind)])}
            />
          ))}
        </div>
      </div>
    </StepScreen>
  )
}
