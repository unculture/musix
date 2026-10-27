import { useRef, type ReactNode } from 'react'
import { speak } from '@/lib/speech'
import { usePrefs } from '@/state/prefs'

const HOVER_DELAY_MS = 900
const HOLD_MS = 550

interface SpeakHandlers {
  onMouseEnter: () => void
  onMouseLeave: () => void
  onPointerDown: (e: React.PointerEvent) => void
  onPointerUp: () => void
  onPointerCancel: () => void
  onClickCapture: (e: React.MouseEvent) => void
}

/**
 * Read `text` aloud when it's pointed at with a mouse for a moment (if read-on-hover is on),
 * or pressed and held with a finger. A press-and-hold only speaks — it doesn't also tap the button.
 */
export function useHoverSpeak(text: string): SpeakHandlers {
  const readOnHover = usePrefs((s) => s.readOnHover)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const held = useRef(false)
  const clearHold = (): void => {
    if (holdTimer.current) clearTimeout(holdTimer.current)
    holdTimer.current = null
  }
  return {
    onMouseEnter: () => {
      if (!readOnHover) return
      hoverTimer.current = setTimeout(() => speak(text), HOVER_DELAY_MS)
    },
    onMouseLeave: () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current)
    },
    onPointerDown: (e) => {
      held.current = false
      if (e.pointerType === 'mouse') return
      clearHold()
      holdTimer.current = setTimeout(() => {
        held.current = true
        speak(text)
      }, HOLD_MS)
    },
    onPointerUp: clearHold,
    onPointerCancel: clearHold,
    onClickCapture: (e) => {
      clearHold()
      if (held.current) {
        held.current = false
        e.preventDefault()
        e.stopPropagation()
      }
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
