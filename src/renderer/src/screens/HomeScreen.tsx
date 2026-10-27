import { useEffect } from 'react'
import { BigButton } from '@/components/BigButton'
import { Mascot } from '@/components/Mascot'
import { SongCard } from '@/components/SongCard'
import { Say } from '@/components/Speakable'
import { useNav } from '@/state/nav'
import { useProject } from '@/state/project'
import { toast } from '@/state/toast'

export function HomeScreen(): React.JSX.Element {
  const go = useNav((s) => s.go)
  const { songs, refresh, create, open, remove, duplicate, rename } = useProject()

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <div className="home">
      <div className="home__hero">
        <div>
          <h1>Let&apos;s make a song!</h1>
          <Mascot message="Hi! I'm Mo. Tap the big button to start a new song." />
        </div>
        <BigButton
          icon="🎵"
          label="New song"
          size="xl"
          onClick={async () => {
            await create()
            go('words')
          }}
        />
      </div>
      <Say as="h2" text="My songs" />
      {songs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon" aria-hidden>
            🎶
          </div>
          <Say text="Your songs will live here." />
        </div>
      ) : (
        <div className="home__songs">
          {songs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              onOpen={async () => {
                const p = await open(song.id)
                if (p) go(p.plan ? 'play' : 'words')
              }}
              onRename={(title) => rename(song.id, title)}
              onDuplicate={() => duplicate(song.id)}
              onDelete={async () => {
                await remove(song.id)
                toast('Song moved to the bin. A grown-up can get it back.', '🗑️')
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
