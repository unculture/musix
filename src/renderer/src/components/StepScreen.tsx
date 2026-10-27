import type { CSSProperties, ReactNode } from 'react'
import { STEPS, useNav, type StepId } from '@/state/nav'
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
        <Mascot message={help} />
      </header>
      <div className="step-screen__body">{children}</div>
      <footer className="step-screen__footer">
        <BigButton
          icon="⬅️"
          label="Back"
          variant="soft"
          color="var(--ink-soft)"
          onClick={() => go(prev ? prev.id : 'home')}
        />
        {footer ??
          (next && (
            <BigButton
              icon="➡️"
              label="Next"
              color={next.color}
              onClick={() => go(next.id)}
              disabled={nextDisabled}
              say={`Next: ${next.label}`}
            />
          ))}
      </footer>
    </section>
  )
}
