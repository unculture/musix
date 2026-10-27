import { useToasts } from '@/state/toast'
import { SpeakButton } from './Speakable'

export function Toasts(): React.JSX.Element {
  const { toasts, dismiss } = useToasts()
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast" onClick={() => dismiss(t.id)}>
          <span className="toast__icon" aria-hidden>
            {t.icon}
          </span>
          <span>{t.text}</span>
          <SpeakButton text={t.text} size="sm" />
        </div>
      ))}
    </div>
  )
}
