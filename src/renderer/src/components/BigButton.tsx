import type { CSSProperties } from 'react'
import { useHoverSpeak } from './Speakable'

interface BigButtonProps {
  icon: string
  label: string
  onClick?: () => void
  color?: string
  size?: 'md' | 'lg' | 'xl'
  variant?: 'solid' | 'soft'
  disabled?: boolean
  /** Text colour on solid buttons; use dark ink on light colours like sun. */
  ink?: string
  /** What to read aloud, if different from the label. */
  say?: string
}

export function BigButton({
  icon,
  label,
  onClick,
  color = 'var(--berry)',
  size = 'md',
  variant = 'solid',
  disabled,
  say,
  ink
}: BigButtonProps): React.JSX.Element {
  const hover = useHoverSpeak(say ?? label)
  return (
    <button
      type="button"
      className={`big-button big-button--${size} big-button--${variant}`}
      style={{ '--btn': color, '--btn-ink': ink ?? '#fff' } as CSSProperties}
      onClick={onClick}
      disabled={disabled}
      {...hover}
    >
      <span className="big-button__icon" aria-hidden>
        {icon}
      </span>
      <span className="big-button__label">{label}</span>
    </button>
  )
}

export function IconButton({
  icon,
  label,
  onClick,
  active
}: {
  icon: string
  label: string
  onClick?: () => void
  active?: boolean
}): React.JSX.Element {
  const hover = useHoverSpeak(label)
  return (
    <button
      type="button"
      className={`icon-button${active ? ' icon-button--active' : ''}`}
      aria-label={label}
      title={label}
      onClick={onClick}
      {...hover}
    >
      {icon}
    </button>
  )
}
