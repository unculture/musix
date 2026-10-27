import { useState } from 'react'
import { coverPrompt } from '@shared/music/magic'
import { aiCover } from '@/lib/ai'
import { celebrate } from '@/lib/celebrate'
import { speak } from '@/lib/speech'
import { useProject } from '@/state/project'
import { BigButton } from './BigButton'

export function CoverMaker(): React.JSX.Element {
  const project = useProject((s) => s.project)!
  const update = useProject((s) => s.update)
  const [busy, setBusy] = useState(false)

  const make = async (): Promise<void> => {
    setBusy(true)
    speak('Drawing a picture for your song!')
    const file = await aiCover(project.id, coverPrompt(project))
    setBusy(false)
    if (!file) return
    update((p) => ({ ...p, cover: file }))
    celebrate()
  }

  return (
    <div className="cover card">
      {project.cover ? (
        <img
          className="cover__img"
          src={`musix://song/${project.id}/${project.cover}`}
          alt="Your song's cover picture"
        />
      ) : (
        <div className="cover__empty" aria-hidden>
          {busy ? '🖌️' : project.emoji}
        </div>
      )}
      <BigButton
        icon="🎨"
        label={busy ? 'Drawing…' : project.cover ? 'New picture' : 'Make a cover picture'}
        variant="soft"
        color="var(--coral)"
        onClick={make}
        disabled={busy}
      />
    </div>
  )
}
