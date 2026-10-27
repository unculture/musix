import { useRef, type ReactNode } from 'react'
import { speak } from '@/lib/speech'
import { usePrefs } from '@/state/prefs'

const HOVER_DELAY_MS = 900

// Speaks `text` when hovered for a moment (if read-on-hover is switched on).
export function useHoverSpeak(text: string): {
  onMouseEnter: () => void
  onMouseLeave: () => void
} {
  const readOnHover = usePrefs((s) => s.readOnHover)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  return {
    onMouseEnter: () => {
      if (!readOnHover) return
      timer.current = setTimeout(() => speak(text), HOVER_DELAY_MS)
    },
    onMouseLeave: () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }
}

export function SpeakButton({
  text,
  size = 'md'
}: {
  text: string
  size?: 'sm' | 'md'
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={`speak-button speak-button--${size}`}
      aria-label="Read this out loud"
      title="Read this out loud"
      onClick={(e) => {
        e.stopPropagation()
        speak(text)
      }}
    >
      🔊
    </button>
  )
}

// Text with a speaker button next to it.
export function Say({
  children,
  text,
  as: Tag = 'p'
}: {
  children?: ReactNode
  text: string
  as?: 'p' | 'h1' | 'h2' | 'span'
}): React.JSX.Element {
  return (
    <Tag className="say">
      <span>{children ?? text}</span>
      <SpeakButton text={text} size="sm" />
    </Tag>
  )
}
