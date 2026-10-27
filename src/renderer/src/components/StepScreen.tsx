import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { STEPS, useNav, type Screen, type StepId } from '@/state/nav'
import { usePrefs } from '@/state/prefs'
import { BigButton } from './BigButton'
import { Mascot } from './Mascot'

interface StepScreenProps {
  step: StepId
  title: string
  help: string
  children?: ReactNode
  nextDisabled?: boolean
  /** Replace the default "Next" button. */
  footer?: ReactNode
}

// Common layout for each step of the journey: title + Mo's tip, content, Back / Next.
export function StepScreen({
  step,
  title,
  help,
  children,
  nextDisabled,
  footer
}: StepScreenProps): React.JSX.Element {
  const go = useNav((s) => s.go)
  // Show the tap landed straight away: the next screen can take a moment to appear.
  const [leaving, setLeaving] = useState<Screen | null>(null)
  const leave = (to: Screen): void => {
    if (leaving) return
    setLeaving(to)
    requestAnimationFrame(() => setTimeout(() => go(to), 0))
  }
  // The first time she reaches each step, Mo reads the tip out loud.
  const [firstVisit] = useState(() => !usePrefs.getState().heard.includes(step))
  useEffect(() => {
    if (firstVisit) usePrefs.getState().markHeard(step)
  }, [firstVisit, step])
  const index = STEPS.findIndex((s) => s.id === step)
  const info = STEPS[index]
  const prev = STEPS[index - 1]
  const next = STEPS[index + 1]

  return (
    <section
      className="step-screen"
      style={{ '--accent': info.color, '--accent-soft': info.soft } as CSSProperties}
    >
      <header className="step-screen__header">
        <h1>
          <span aria-hidden>{info.icon}</span> {title}
        </h1>
        <Mascot message={help} autoSpeak={firstVisit} />
      </header>
      <div className="step-screen__body">{children}</div>
      <footer className="step-screen__footer">
        <BigButton
          icon="⬅️"
          label="Back"
          variant="soft"
          color="var(--ink-soft)"
          onClick={() => leave(prev ? prev.id : 'home')}
          busy={leaving === (prev ? prev.id : 'home')}
        />
        {footer ??
          (next && (
            <BigButton
              icon="➡️"
              label="Next"
              color={next.color}
              onClick={() => leave(next.id)}
              busy={leaving === next.id}
              disabled={nextDisabled}
              say={`Next: ${next.label}`}
            />
          ))}
      </footer>
    </section>
  )
}
