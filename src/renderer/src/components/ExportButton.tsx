import { useState } from 'react'
import { encodeInWorker, renderSong } from '@/audio/export'
import { usePlayer } from '@/audio/player'
import { celebrate } from '@/lib/celebrate'
import { speak } from '@/lib/speech'
import { useProject } from '@/state/project'
import { toast } from '@/state/toast'
import { BigButton } from './BigButton'

type Stage =
  | { kind: 'idle' }
  | { kind: 'mixing' }
  | { kind: 'encoding'; fraction: number }
  | { kind: 'saved'; path: string }

export function ExportButton(): React.JSX.Element {
  const project = useProject((s) => s.project)!
  const { duration, status, pause } = usePlayer()
  const [stage, setStage] = useState<Stage>({ kind: 'idle' })

  const run = async (): Promise<void> => {
    pause()
    setStage({ kind: 'mixing' })
    try {
      const buffer = await renderSong(project, duration)
      setStage({ kind: 'encoding', fraction: 0 })
      const cover = project.cover
        ? new Uint8Array(
            await (await fetch(`musix://song/${project.id}/${project.cover}`)).arrayBuffer()
          )
        : undefined
      const mp3 = await encodeInWorker(
        buffer,
        project.title,
        (fraction) => setStage({ kind: 'encoding', fraction }),
        cover
      )
      const path = await window.musix.files.saveMp3(mp3, project.title)
      if (!path) {
        setStage({ kind: 'idle' })
        return
      }
      setStage({ kind: 'saved', path })
      celebrate()
      speak('Your song is saved! You can play it anywhere now.')
    } catch (e) {
      console.error(e)
      toast("Hmm, I couldn't save the song that time. Let's try again.", '💾')
      setStage({ kind: 'idle' })
    }
  }

  if (stage.kind === 'mixing' || stage.kind === 'encoding') {
    const pct = stage.kind === 'mixing' ? 15 : 15 + stage.fraction * 85
    return (
      <div className="export-progress" role="status">
        <span>{stage.kind === 'mixing' ? '🎚️ Mixing your song…' : '💿 Making the MP3…'}</span>
        <div className="make__bar">
          <div style={{ width: `${pct}%`, transitionDuration: '0.3s' }} />
        </div>
      </div>
    )
  }

  if (stage.kind === 'saved') {
    return (
      <div className="export-done">
        <BigButton
          icon="📂"
          label="Show me"
          color="var(--sky)"
          onClick={() => window.musix.files.showInFolder(stage.path)}
        />
        <BigButton icon="💾" label="Save again" variant="soft" color="var(--leaf)" onClick={run} />
      </div>
    )
  }

  return (
    <BigButton
      icon="💾"
      label="Save MP3"
      color="var(--leaf)"
      onClick={run}
      disabled={status !== 'ready'}
      say="Save my song as an MP3"
    />
  )
}
