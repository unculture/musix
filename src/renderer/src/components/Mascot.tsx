import { useEffect } from 'react'
import { speak } from '@/lib/speech'
import { SpeakButton } from './Speakable'

// Mo, the friendly music monster, gives short spoken instructions on every screen.
export function Mascot({
  message,
  autoSpeak = false
}: {
  message: string
  autoSpeak?: boolean
}): React.JSX.Element {
  useEffect(() => {
    if (autoSpeak) speak(message)
  }, [autoSpeak, message])

  return (
    <div className="mascot">
      <div className="mascot__face" aria-hidden>
        👾
      </div>
      <div className="mascot__bubble">
        <span>{message}</span>
        <SpeakButton text={message} size="sm" />
      </div>
    </div>
  )
}
