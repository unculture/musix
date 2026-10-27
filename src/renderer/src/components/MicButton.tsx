import { useState, type CSSProperties } from 'react'
import { aiTranscribe } from '@/lib/ai'
import { blobToBase64, useRecorder } from '@/lib/recorder'
import { toast } from '@/state/toast'
import { useHoverSpeak } from './Speakable'

interface MicButtonProps {
  /** Called with what was said. */
  onText: (text: string) => void
  hint?: string
  label?: string
  size?: 'md' | 'lg'
}

// Tap to talk, tap again to finish. Shows a pulsing ring that follows her voice.
export function MicButton({
  onText,
  hint,
  label = 'Say it',
  size = 'md'
}: MicButtonProps): React.JSX.Element {
  const { recording, level, start, stop } = useRecorder()
  const [thinking, setThinking] = useState(false)
  const hover = useHoverSpeak(recording ? 'Tap when you have finished' : label)

  const click = async (): Promise<void> => {
    if (thinking) return
    if (!recording) {
      if (!(await start())) toast('I need to use the microphone. Ask a grown-up to allow it.', '🎙️')
      return
    }
    const rec = await stop()
    if (!rec || rec.durationMs < 600) return
    setThinking(true)
    const text = await aiTranscribe({
      audio: await blobToBase64(rec.blob),
      format: rec.format,
      hint
    })
    setThinking(false)
    if (text === null) return
    if (!text.trim()) toast("I didn't hear any words that time. Try again a bit louder?", '👂')
    else onText(text.trim())
  }

  return (
    <button
      type="button"
      className={`mic-button mic-button--${size}${recording ? ' mic-button--on' : ''}${thinking ? ' mic-button--thinking' : ''}`}
      style={{ '--level': level.toFixed(3) } as CSSProperties}
      onClick={click}
      aria-label={recording ? 'Stop' : label}
      {...hover}
    >
      <span className="mic-button__icon" aria-hidden>
        {thinking ? '💭' : recording ? '⏹️' : '🎙️'}
      </span>
      <span>{thinking ? 'Listening…' : recording ? 'Done' : label}</span>
    </button>
  )
}
