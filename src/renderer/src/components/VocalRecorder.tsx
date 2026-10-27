import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { newId, type AudioLayer } from '@shared/project'
import { usePlayer } from '@/audio/player'
import { startVocalSession, type VocalSession } from '@/audio/vocals'
import { celebrate } from '@/lib/celebrate'
import { speak } from '@/lib/speech'
import { useProject } from '@/state/project'
import { toast } from '@/state/toast'
import { BigButton } from './BigButton'
import { useHoverSpeak } from './Speakable'

// Sing along and record it. Each go is a "take"; the starred take is the one in the song.

function TakeChip({
  take,
  onStar,
  onDelete
}: {
  take: AudioLayer
  onStar: () => void
  onDelete: () => void
}): React.JSX.Element {
  const hover = useHoverSpeak(
    take.muted
      ? `${take.name}. Tap the star to use this one.`
      : `${take.name}. This one is in your song.`
  )
  return (
    <div className={`take${take.muted ? '' : ' take--on'}`} {...hover}>
      <button type="button" onClick={onStar} aria-label={`Use ${take.name}`} title="Use this one">
        {take.muted ? '☆' : '⭐'}
      </button>
      <span>🎤 {take.name}</span>
      <button type="button" onClick={onDelete} aria-label={`Bin ${take.name}`} title="Bin it">
        🗑️
      </button>
    </div>
  )
}

export function VocalRecorder(): React.JSX.Element {
  const project = useProject((s) => s.project)!
  const update = useProject((s) => s.update)
  const { playing, status, seek, play, pause } = usePlayer()
  const [session, setSession] = useState<VocalSession | null>(null)
  const [level, setLevel] = useState(0)
  const finishing = useRef(false)
  const takes = project.layers.filter((l) => l.kind === 'vocal')

  // Bouncy level ring while recording.
  useEffect(() => {
    if (!session) return
    let raf = 0
    const tick = (): void => {
      setLevel(session.level())
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [session])

  const finish = async (): Promise<void> => {
    if (!session || finishing.current) return
    finishing.current = true
    pause()
    const take = await session.stop()
    setSession(null)
    finishing.current = false
    const file = await window.musix.projects.writeAudio(
      project.id,
      `vocal-${Date.now()}.webm`,
      new Uint8Array(await take.blob.arrayBuffer())
    )
    const number = Math.max(0, ...takes.map((t) => Number(t.name.replace(/\D/g, '')) || 0)) + 1
    update((p) => ({
      ...p,
      layers: [
        // The newest take becomes the one in the song.
        ...p.layers.map((l) => (l.kind === 'vocal' ? { ...l, muted: true } : l)),
        {
          id: newId(),
          kind: 'vocal',
          name: `Take ${number}`,
          file,
          offset: -take.trim,
          volume: 0.9,
          muted: false
        }
      ]
    }))
    celebrate()
    speak('Great singing! Press play to hear yourself.')
  }

  // The song reaching the end finishes the take.
  useEffect(() => {
    if (session && !playing && !finishing.current) finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  const record = async (): Promise<void> => {
    speak('Put your headphones on, then sing along!')
    await new Promise((r) => setTimeout(r, 2200))
    const s = await startVocalSession()
    if (!s) {
      toast('I need to use the microphone. Ask a grown-up to allow it.', '🎙️')
      return
    }
    // Don't play older takes while recording a new one.
    update((p) => ({
      ...p,
      layers: p.layers.map((l) => (l.kind === 'vocal' ? { ...l, muted: true } : l))
    }))
    seek(0)
    setSession(s)
    await play(s.songStart)
  }

  const star = (id: string): void =>
    update((p) => ({
      ...p,
      layers: p.layers.map((l) => (l.kind === 'vocal' ? { ...l, muted: l.id !== id } : l))
    }))
  const remove = (id: string): void =>
    update((p) => ({ ...p, layers: p.layers.filter((l) => l.id !== id) }))

  return (
    <div className="vocals card">
      {session ? (
        <div className="vocals__live">
          <span
            className="vocals__dot"
            style={{ '--level': level.toFixed(3) } as CSSProperties}
            aria-hidden
          >
            🎤
          </span>
          <span className="vocals__rec">Recording… sing along!</span>
          <BigButton icon="⏹️" label="Stop" color="var(--berry)" onClick={finish} />
        </div>
      ) : (
        <>
          <BigButton
            icon="🔴"
            label={takes.length ? 'Record again' : 'Record me singing'}
            color="var(--berry)"
            onClick={record}
            disabled={status !== 'ready'}
          />
          <p className="vocals__tip">🎧 Headphones help!</p>
        </>
      )}
      {takes.length > 0 && !session && (
        <div className="vocals__takes">
          {takes.map((t) => (
            <TakeChip key={t.id} take={t} onStar={() => star(t.id)} onDelete={() => remove(t.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
