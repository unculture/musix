import { useState, type CSSProperties } from 'react'
import type { PartRole, SongPlan } from '@shared/project'
import { PART_ROLES } from '@shared/project'
import { instrumentInfo, instrumentsFor } from '@shared/music/instruments'
import {
  addInstrumental,
  chordChoices,
  deleteSection,
  duplicateSection,
  MAX_BPM,
  MIN_BPM,
  moveSection,
  setChord,
  setInstrument,
  setPartMix,
  setTempo,
  surpriseChord,
  transpose,
  transposeLimits,
  updateSection
} from '@shared/music/edit'
import { previewInstrument } from '@/audio/preview'
import { SECTION_INFO } from '@/lib/lyrics'
import { speak } from '@/lib/speech'
import { useProject } from '@/state/project'
import { useHoverSpeak } from './Speakable'

type Tab = 'mix' | 'sounds' | 'parts' | 'speed'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'mix', icon: '🎚️', label: 'Loud or quiet' },
  { id: 'sounds', icon: '🎸', label: 'Instruments' },
  { id: 'parts', icon: '🧱', label: 'Song parts' },
  { id: 'speed', icon: '🐇', label: 'Speed and voice' }
]

const ROLE_INFO: Record<PartRole, { label: string; color: string }> = {
  drums: { label: 'Drums', color: 'var(--coral)' },
  bass: { label: 'Bass', color: 'var(--grape)' },
  chords: { label: 'Chords', color: 'var(--sky)' },
  pad: { label: 'Background', color: 'var(--leaf)' },
  melody: { label: 'Tune', color: 'var(--berry)' }
}

const ENERGY = [
  { value: 1, emoji: '🤫', label: 'Very quiet' },
  { value: 2, emoji: '😌', label: 'Quiet' },
  { value: 3, emoji: '🙂', label: 'Medium' },
  { value: 4, emoji: '😃', label: 'Big' },
  { value: 5, emoji: '🔥', label: 'Huge' }
]

function Chip({
  children,
  onClick,
  on,
  label,
  color
}: {
  children: React.ReactNode
  onClick: () => void
  on?: boolean
  label: string
  color?: string
}): React.JSX.Element {
  const hover = useHoverSpeak(label)
  return (
    <button
      type="button"
      className={`chip${on ? ' chip--on' : ''}`}
      style={color ? ({ '--chip': color } as CSSProperties) : undefined}
      onClick={onClick}
      aria-label={label}
      title={label}
      {...hover}
    >
      {children}
    </button>
  )
}

export function TrackEditor(): React.JSX.Element {
  const project = useProject((s) => s.project)!
  const update = useProject((s) => s.update)
  const plan = project.plan!
  const [tab, setTab] = useState<Tab>('mix')
  const [picking, setPicking] = useState<PartRole | null>(null)
  const [selected, setSelected] = useState(0)
  const [chordAt, setChordAt] = useState<number | null>(null)

  const edit = (fn: (p: SongPlan) => SongPlan): void =>
    update((p) => (p.plan ? { ...p, plan: fn(p.plan) } : p))
  const section = plan.sections[Math.min(selected, plan.sections.length - 1)]
  const sel = Math.min(selected, plan.sections.length - 1)
  const limits = transposeLimits(plan)

  return (
    <div className="editor">
      <div className="editor__tabs" role="tablist">
        {TABS.map((t) => (
          <Chip key={t.id} on={tab === t.id} label={t.label} onClick={() => setTab(t.id)}>
            <span aria-hidden>{t.icon}</span> {t.label}
          </Chip>
        ))}
      </div>

      {tab === 'mix' && (
        <div className="mixer">
          {PART_ROLES.map((role) => {
            const part = plan.parts.find((p) => p.role === role)
            if (!part || part.instrument === 'none') return null
            const info = instrumentInfo(role, part.instrument)
            return (
              <div
                key={role}
                className="mixer__row"
                style={{ '--row': ROLE_INFO[role].color } as CSSProperties}
              >
                <span className="mixer__name">
                  <span aria-hidden>{info?.emoji}</span> {ROLE_INFO[role].label}
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={part.volume}
                  aria-label={`${ROLE_INFO[role].label} volume`}
                  onChange={(e) =>
                    edit((p) =>
                      setPartMix(p, role, { volume: Number(e.target.value), muted: false })
                    )
                  }
                />
                <Chip
                  label={
                    part.muted
                      ? `Turn ${ROLE_INFO[role].label} on`
                      : `Turn ${ROLE_INFO[role].label} off`
                  }
                  on={part.muted}
                  onClick={() => edit((p) => setPartMix(p, role, { muted: !part.muted }))}
                >
                  {part.muted ? '🔇' : '🔊'}
                </Chip>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'sounds' && (
        <div className="sounds">
          {PART_ROLES.map((role) => {
            const part = plan.parts.find((p) => p.role === role)!
            const info = instrumentInfo(role, part.instrument)
            return (
              <div key={role} className="sounds__row">
                <button
                  type="button"
                  className={`sounds__current${picking === role ? ' sounds__current--open' : ''}`}
                  style={{ '--row': ROLE_INFO[role].color } as CSSProperties}
                  onClick={() => setPicking(picking === role ? null : role)}
                >
                  <span className="sounds__role">{ROLE_INFO[role].label}</span>
                  <span className="sounds__emoji" aria-hidden>
                    {info?.emoji ?? '❓'}
                  </span>
                  <span>{info?.label ?? part.instrument}</span>
                </button>
                {picking === role && (
                  <div className="sounds__picker">
                    {[...new Map(instrumentsFor(role).map((i) => [i.id, i])).values()].map((i) => (
                      <Chip
                        key={i.id}
                        label={i.label}
                        on={i.id === part.instrument}
                        onClick={() => {
                          edit((p) => setInstrument(p, role, i.id))
                          previewInstrument(role, i.id)
                        }}
                      >
                        <span className="chip__emoji" aria-hidden>
                          {i.emoji}
                        </span>
                        {i.label}
                      </Chip>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'parts' && (
        <div className="parts">
          <div className="parts__strip">
            {plan.sections.map((s, i) => {
              const info = SECTION_INFO[s.kind]
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`parts__block${i === sel ? ' parts__block--on' : ''}`}
                  style={
                    {
                      '--sec': info.color,
                      '--sec-soft': info.soft,
                      flexGrow: s.bars
                    } as CSSProperties
                  }
                  onClick={() => {
                    setSelected(i)
                    setChordAt(null)
                    speak(info.label)
                  }}
                >
                  <span aria-hidden>{info.icon}</span>
                  <span className="parts__label">{info.label}</span>
                </button>
              )
            })}
          </div>

          {section && (
            <div className="parts__detail card">
              <div className="parts__tools">
                <Chip
                  label="Move earlier"
                  onClick={() => {
                    edit((p) => moveSection(p, sel, sel - 1))
                    setSelected(Math.max(0, sel - 1))
                  }}
                >
                  ⬅️
                </Chip>
                <Chip
                  label="Move later"
                  onClick={() => {
                    edit((p) => moveSection(p, sel, sel + 1))
                    setSelected(Math.min(plan.sections.length - 1, sel + 1))
                  }}
                >
                  ➡️
                </Chip>
                <Chip
                  label="Copy this part"
                  onClick={() => {
                    edit((p) => duplicateSection(p, sel))
                    setSelected(sel + 1)
                  }}
                >
                  👯 Copy
                </Chip>
                <Chip
                  label="Add a music bit after this"
                  onClick={() => {
                    edit((p) => addInstrumental(p, sel + 1))
                    setSelected(sel + 1)
                  }}
                >
                  🎸 Add music bit
                </Chip>
                {plan.sections.length > 1 && (
                  <Chip
                    label="Bin this part"
                    onClick={() => {
                      edit((p) => deleteSection(p, sel))
                      setSelected(Math.max(0, sel - 1))
                    }}
                  >
                    🗑️
                  </Chip>
                )}
              </div>

              <div className="parts__row">
                <span className="parts__heading">How big?</span>
                {ENERGY.map((e) => (
                  <Chip
                    key={e.value}
                    label={e.label}
                    on={section.energy === e.value}
                    onClick={() => edit((p) => updateSection(p, sel, { energy: e.value }))}
                  >
                    {e.emoji}
                  </Chip>
                ))}
              </div>

              <div className="parts__row parts__row--wrap">
                <span className="parts__heading">Chords</span>
                {section.chords.map((c, ci) => (
                  <Chip
                    key={ci}
                    label={`Chord ${c.symbol}. Tap to change`}
                    on={chordAt === ci}
                    color={SECTION_INFO[section.kind].color}
                    onClick={() => setChordAt(chordAt === ci ? null : ci)}
                  >
                    {c.symbol}
                  </Chip>
                ))}
              </div>
              {chordAt !== null && section.chords[chordAt] && (
                <div className="parts__row parts__row--wrap parts__choices">
                  {chordChoices(plan).map((choice) => (
                    <Chip
                      key={choice}
                      label={choice}
                      on={choice === section.chords[chordAt].symbol}
                      onClick={() => edit((p) => setChord(p, sel, chordAt, choice))}
                    >
                      {choice}
                    </Chip>
                  ))}
                  <Chip
                    label="Surprise me"
                    onClick={() =>
                      edit((p) =>
                        setChord(p, sel, chordAt, surpriseChord(p, section.chords[chordAt].symbol))
                      )
                    }
                  >
                    🎲 Surprise me
                  </Chip>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'speed' && (
        <div className="speed">
          <div className="speed__row card">
            <span className="parts__heading">Speed</span>
            <Chip label="Slower" onClick={() => edit((p) => setTempo(p, p.bpm - 6))}>
              🐢 Slower
            </Chip>
            <input
              type="range"
              min={MIN_BPM}
              max={MAX_BPM}
              value={plan.bpm}
              aria-label="Speed"
              onChange={(e) => edit((p) => setTempo(p, Number(e.target.value)))}
            />
            <Chip label="Faster" onClick={() => edit((p) => setTempo(p, p.bpm + 6))}>
              🐇 Faster
            </Chip>
          </div>
          <div className="speed__row card">
            <span className="parts__heading">Voice</span>
            <Chip
              label="Lower, for a deeper voice"
              onClick={() => limits.down > 0 && edit((p) => transpose(p, -1))}
            >
              🔽 Lower
            </Chip>
            <span className="speed__key">
              🎼 {plan.key} {plan.scale === 'major' ? '😊' : '🌙'}
            </span>
            <Chip
              label="Higher, for a squeakier voice"
              onClick={() => limits.up > 0 && edit((p) => transpose(p, 1))}
            >
              🔼 Higher
            </Chip>
          </div>
        </div>
      )}
    </div>
  )
}
