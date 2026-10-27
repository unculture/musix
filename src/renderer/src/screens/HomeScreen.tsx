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

  // A .musix file double-clicked outside the app: open it straight away.
  useEffect(() => {
    const openImported = async (): Promise<void> => {
      const ids = await window.musix.files.takeImported()
      if (!ids.length) return
      await refresh()
      const p = await open(ids[ids.length - 1])
      if (p) go(p.plan ? 'play' : 'words')
    }
    openImported()
    return window.musix.files.onSongImported(openImported)
  }, [refresh, open, go])

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
      <div className="home__songs-head">
        <Say as="h2" text="My songs" />
        <BigButton
          icon="📥"
          label="Open a song file"
          variant="soft"
          color="var(--sky)"
          onClick={async () => {
            const id = await window.musix.files.importSong()
            if (id) {
              await refresh()
              toast('Song added!', '📥')
            }
          }}
        />
      </div>
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
              onShare={async () => {
                const path = await window.musix.files.exportSong(song.id, song.title)
                if (path) toast('Saved a copy of your song!', '📦')
              }}
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
