import { useEffect } from 'react'
import { usePlayer } from '@/audio/player'
import { BigButton } from '@/components/BigButton'
import { Karaoke } from '@/components/Karaoke'
import { useHoverSpeak } from '@/components/Speakable'
import { StepScreen } from '@/components/StepScreen'
import { Timeline } from '@/components/Timeline'
import { useNav } from '@/state/nav'
import { useProject } from '@/state/project'

function PlayButton(): React.JSX.Element {
  const { playing, play, pause, status } = usePlayer()
  const hover = useHoverSpeak(playing ? 'Pause' : 'Play')
  return (
    <button
      type="button"
      className={`play-button${playing ? ' play-button--on' : ''}`}
      onClick={() => (playing ? pause() : play())}
      disabled={status !== 'ready'}
      aria-label={playing ? 'Pause' : 'Play'}
      {...hover}
    >
      {status === 'loading' ? '⏳' : playing ? '⏸️' : '▶️'}
    </button>
  )
}

export function PlayScreen(): React.JSX.Element {
  const project = useProject((s) => s.project)!
  const go = useNav((s) => s.go)
  const { load, song, position, bpm, seek, stop, status, pause } = usePlayer()
  const plan = project.plan

  useEffect(() => {
    load(project)
  }, [project, load])

  // Stop the music when leaving the screen.
  useEffect(() => () => pause(), [pause])

  if (!plan) {
    return (
      <StepScreen step="play" title="Play and sing" help="Let's make your song first!">
        <div className="make">
          <BigButton
            icon="✨"
            label="Make my song"
            size="xl"
            color="var(--grape)"
            onClick={() => go('make')}
          />
        </div>
      </StepScreen>
    )
  }

  const beat = (position * bpm) / 60

  return (
    <StepScreen
      step="play"
      title={`${project.emoji} ${project.title}`}
      help={
        status === 'loading'
          ? 'Getting the instruments ready…'
          : 'Press play and sing along! The words light up when it is time to sing them.'
      }
      footer={<span />}
    >
      <div className="play">
        <Karaoke plan={plan} lyrics={project.lyrics} beat={beat} />
        {song && (
          <Timeline
            sections={song.arrangement.sections}
            totalBeats={song.arrangement.totalBeats}
            beat={beat}
            onSeek={(b) => seek((b * 60) / bpm)}
          />
        )}
        <div className="play__transport">
          <button
            type="button"
            className="round-button"
            onClick={stop}
            aria-label="Back to the start"
            title="Back to the start"
          >
            ⏮️
          </button>
          <PlayButton />
          <span className="play__time">
            {Math.floor(position / 60)}:{String(Math.floor(position % 60)).padStart(2, '0')}
          </span>
        </div>
        {status === 'error' && (
          <p>Hmm, some instruments didn&apos;t load. Try going back and forward again.</p>
        )}
      </div>
    </StepScreen>
  )
}
