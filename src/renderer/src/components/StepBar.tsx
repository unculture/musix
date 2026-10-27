import type { CSSProperties } from 'react'
import { STEPS, useNav } from '@/state/nav'
import { useHoverSpeak } from './Speakable'

function Step({
  step,
  index,
  current
}: {
  step: (typeof STEPS)[number]
  index: number
  current: number
}): React.JSX.Element {
  const go = useNav((s) => s.go)
  const hover = useHoverSpeak(`Step ${index + 1}: ${step.label}`)
  const state = index === current ? 'current' : index < current ? 'done' : 'todo'
  return (
    <button
      type="button"
      className={`step step--${state}`}
      style={
        { '--step': step.color, '--step-soft': step.soft, '--step-ink': step.ink } as CSSProperties
      }
      onClick={() => go(step.id)}
      aria-current={state === 'current' ? 'step' : undefined}
      {...hover}
    >
      <span className="step__icon" aria-hidden>
        {step.icon}
      </span>
      <span className="step__label">{step.label}</span>
    </button>
  )
}

export function StepBar(): React.JSX.Element {
  const screen = useNav((s) => s.screen)
  const current = STEPS.findIndex((s) => s.id === screen)
  return (
    <nav className="step-bar" aria-label="Song steps">
      {STEPS.map((step, i) => (
        <Step key={step.id} step={step} index={i} current={current} />
      ))}
    </nav>
  )
}
