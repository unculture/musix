import { useRef, useState } from 'react'

const HOLD_MS = 3000

// Keeps little fingers out of the grown-up settings: hold a button, then answer a sum.
export function ParentGate({ onPass }: { onPass: () => void }): React.JSX.Element {
  const [held, setHeld] = useState(false)
  const [progress, setProgress] = useState(0)
  const [answer, setAnswer] = useState('')
  const timer = useRef<number | null>(null)
  const [{ a, b }] = useState(() => ({
    a: 12 + Math.floor(Math.random() * 8),
    b: 6 + Math.floor(Math.random() * 4)
  }))

  const start = (): void => {
    const began = performance.now()
    const tick = (): void => {
      const p = Math.min(1, (performance.now() - began) / HOLD_MS)
      setProgress(p)
      if (p >= 1) setHeld(true)
      else timer.current = requestAnimationFrame(tick)
    }
    timer.current = requestAnimationFrame(tick)
  }
  const stop = (): void => {
    if (timer.current) cancelAnimationFrame(timer.current)
    if (!held) setProgress(0)
  }

  if (!held) {
    return (
      <button
        type="button"
        className="parent-gate__hold"
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        style={{ backgroundSize: `${progress * 100}% 100%` }}
      >
        🔒 Grown-ups: press and hold
      </button>
    )
  }

  return (
    <form
      className="parent-gate__sum"
      onSubmit={(e) => {
        e.preventDefault()
        if (Number(answer) === a * b) onPass()
        else setAnswer('')
      }}
    >
      <label>
        What is {a} × {b}?{' '}
        <input
          type="text"
          inputMode="numeric"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          autoFocus
          size={4}
        />
      </label>
      <button type="submit" className="choice">
        OK
      </button>
    </form>
  )
}
