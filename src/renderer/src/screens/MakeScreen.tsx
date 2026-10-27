import { useEffect, useState } from 'react'
import { BigButton } from '@/components/BigButton'
import { StepScreen } from '@/components/StepScreen'
import { celebrate } from '@/lib/celebrate'
import { composeSong } from '@/lib/compose'
import { hasWords } from '@/lib/lyrics'
import { speak } from '@/lib/speech'
import { useNav } from '@/state/nav'
import { useProject } from '@/state/project'

const BUSY_MESSAGES = [
  'Reading your words…',
  'Picking the chords…',
  'Tuning the guitars…',
  'Finding a catchy tune…',
  'Warming up the drums…',
  'Adding some sparkle…',
  'Nearly there…'
]

export function MakeScreen(): React.JSX.Element {
  const project = useProject((s) => s.project)!
  const update = useProject((s) => s.update)
  const go = useNav((s) => s.go)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(0)

  useEffect(() => {
    if (!busy) return
    const timer = setInterval(() => setMsg((m) => Math.min(m + 1, BUSY_MESSAGES.length - 1)), 3000)
    return () => clearInterval(timer)
  }, [busy])

  const make = async (): Promise<void> => {
    setBusy(true)
    setMsg(0)
    speak("Here we go! I'm making your song.")
    const { plan, title } = await composeSong(project)
    update((p) => ({ ...p, plan, title: title && p.title === 'My new song' ? title : p.title }))
    setBusy(false)
    celebrate()
    speak('Ta-da! Your song is ready!')
    go('play')
  }

  const ready = hasWords(project.lyrics)

  return (
    <StepScreen
      step="make"
      title="Make it!"
      help={
        busy
          ? 'I am making your song. This takes a little while.'
          : ready
            ? "Ready? Press the big button and I'll turn your words into music!"
            : 'First, add some words to your song.'
      }
      footer={
        project.plan && !busy ? (
          <BigButton
            icon="🎧"
            label="Play my song"
            color="var(--leaf)"
            onClick={() => go('play')}
          />
        ) : (
          <span />
        )
      }
    >
      <div className="make">
        {busy ? (
          <div className="make__busy" role="status">
            <div className="make__notes" aria-hidden>
              <span>🎵</span>
              <span>🎶</span>
              <span>🎵</span>
            </div>
            <p className="make__msg">{BUSY_MESSAGES[msg]}</p>
            <div className="make__bar">
              <div style={{ width: `${((msg + 1) / BUSY_MESSAGES.length) * 100}%` }} />
            </div>
          </div>
        ) : (
          <BigButton
            icon="✨"
            label={project.plan ? 'Make it again' : 'Make my song!'}
            size="xl"
            color="var(--grape)"
            onClick={make}
            disabled={!ready}
            say={project.plan ? 'Make a new version of my song' : 'Make my song'}
          />
        )}
      </div>
    </StepScreen>
  )
}
