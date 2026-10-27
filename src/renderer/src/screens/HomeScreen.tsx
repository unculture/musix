import { BigButton } from '@/components/BigButton'
import { Mascot } from '@/components/Mascot'
import { Say } from '@/components/Speakable'
import { useNav } from '@/state/nav'

export function HomeScreen(): React.JSX.Element {
  const go = useNav((s) => s.go)
  return (
    <div className="home">
      <div className="home__hero">
        <div>
          <h1>Let&apos;s make a song!</h1>
          <Mascot message="Hi! I'm Mo. Tap the big button to start a new song." />
        </div>
        <BigButton icon="🎵" label="New song" size="xl" onClick={() => go('words')} />
      </div>
      <Say as="h2" text="My songs" />
      <div className="empty-state">
        <div className="empty-state__icon" aria-hidden>
          🎶
        </div>
        <Say text="Your songs will live here." />
      </div>
    </div>
  )
}
