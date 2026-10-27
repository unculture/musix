import { useState, type CSSProperties } from 'react'
import type { ProjectSummary } from '@shared/project'
import { speak } from '@/lib/speech'
import { useHoverSpeak } from './Speakable'

interface SongCardProps {
  song: ProjectSummary
  onOpen: () => void
  onRename: (title: string) => void
  onDuplicate: () => void
  onDelete: () => void
}

function whenText(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days < 1) return 'Today'
  if (days < 2) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function SongCard({
  song,
  onOpen,
  onRename,
  onDuplicate,
  onDelete
}: SongCardProps): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [title, setTitle] = useState(song.title)
  const hover = useHoverSpeak(song.title)

  return (
    <div
      className="song-card"
      style={
        {
          '--card': `var(--${song.color})`,
          '--card-soft': `var(--${song.color}-soft)`
        } as CSSProperties
      }
    >
      <button type="button" className="song-card__open" onClick={onOpen} {...hover}>
        <span className="song-card__emoji" aria-hidden>
          {song.emoji}
        </span>
        {!editing && <span className="song-card__title">{song.title}</span>}
        <span className="song-card__when">
          {song.hasSong ? '🎧 ' : '✏️ '}
          {whenText(song.updatedAt)}
        </span>
      </button>
      {editing && (
        <form
          className="song-card__rename"
          onSubmit={(e) => {
            e.preventDefault()
            onRename(title)
            setEditing(false)
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            onFocus={(e) => e.target.select()}
          />
          <button type="submit" aria-label="Save name">
            ✅
          </button>
        </form>
      )}
      {confirming ? (
        <div className="song-card__confirm">
          <span>Bin this song?</span>
          <button type="button" onClick={onDelete}>
            🗑️ Yes
          </button>
          <button type="button" onClick={() => setConfirming(false)}>
            💛 Keep
          </button>
        </div>
      ) : (
        <div className="song-card__tools">
          <button
            type="button"
            aria-label="Hear the name"
            title="Hear the name"
            onClick={() => speak(song.title)}
          >
            🔊
          </button>
          <button
            type="button"
            aria-label="Change the name"
            title="Change the name"
            onClick={() => setEditing(true)}
          >
            🏷️
          </button>
          <button type="button" aria-label="Make a copy" title="Make a copy" onClick={onDuplicate}>
            👯
          </button>
          <button
            type="button"
            aria-label="Bin it"
            title="Bin it"
            onClick={() => {
              setConfirming(true)
              speak('Bin this song?')
            }}
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  )
}
