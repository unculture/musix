import type { CSSProperties } from 'react'
import { MOODS, type StyleChoice } from '@shared/project'
import { MOOD_INFO, SPEEDS, STYLE_PRESETS } from '@shared/styles'
import { MicButton } from '@/components/MicButton'
import { Say, useHoverSpeak } from '@/components/Speakable'
import { StepScreen } from '@/components/StepScreen'
import { speak } from '@/lib/speech'
import { useProject } from '@/state/project'

function Tile({
  emoji,
  label,
  on,
  color,
  onClick,
  size = 'md'
}: {
  emoji: string
  label: string
  on: boolean
  color?: string
  onClick: () => void
  size?: 'md' | 'sm'
}): React.JSX.Element {
  const hover = useHoverSpeak(label)
  return (
    <button
      type="button"
      className={`tile tile--${size}${on ? ' tile--on' : ''}`}
      style={
        {
          '--tile': color ? `var(--${color})` : 'var(--sun)',
          '--tile-soft': color ? `var(--${color}-soft)` : 'var(--sun-soft)'
        } as CSSProperties
      }
      onClick={() => {
        onClick()
        speak(label)
      }}
      aria-pressed={on}
      {...hover}
    >
      <span className="tile__emoji" aria-hidden>
        {emoji}
      </span>
      <span className="tile__label">{label}</span>
    </button>
  )
}

export function StyleScreen(): React.JSX.Element {
  const project = useProject((s) => s.project)!
  const update = useProject((s) => s.update)
  const style = project.style
  const set = (change: Partial<StyleChoice>): void =>
    update((p) => ({ ...p, style: { ...p.style, ...change } }))

  return (
    <StepScreen
      step="style"
      title="Pick a style"
      help="What kind of song is it? Pick a picture, or tell me in your own words. Then pick a feeling and a speed."
      nextDisabled={!style.preset && !style.description.trim()}
    >
      <div className="style-step">
        <div className="tiles">
          {STYLE_PRESETS.map((p) => (
            <Tile
              key={p.id}
              emoji={p.emoji}
              label={p.label}
              color={p.color}
              on={style.preset === p.id}
              onClick={() => set({ preset: style.preset === p.id ? undefined : p.id })}
            />
          ))}
        </div>

        <div className="style-step__describe card">
          <Say as="h2" text="Or tell me what it sounds like" />
          <textarea
            className="style-step__text"
            value={style.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Like… happy pop with ukulele and whistling"
            rows={2}
          />
          <MicButton
            label="Say it"
            hint="The child is describing the kind of music they want."
            onText={(said) =>
              set({
                description: style.description.trim() ? `${style.description.trim()} ${said}` : said
              })
            }
          />
        </div>

        <div className="style-step__row">
          <Say as="h2" text="How does it feel?" />
          <div className="tiles tiles--small">
            {MOODS.map((m) => (
              <Tile
                key={m}
                size="sm"
                emoji={MOOD_INFO[m].emoji}
                label={MOOD_INFO[m].label}
                on={style.mood === m}
                onClick={() => set({ mood: style.mood === m ? undefined : m })}
              />
            ))}
          </div>
        </div>

        <div className="style-step__row">
          <Say as="h2" text="How fast?" />
          <div className="tiles tiles--small">
            {SPEEDS.map((s) => (
              <Tile
                key={s.value}
                size="sm"
                emoji={s.emoji}
                label={s.label}
                color="sky"
                on={style.speed === s.value}
                onClick={() => set({ speed: s.value })}
              />
            ))}
          </div>
        </div>
      </div>
    </StepScreen>
  )
}
