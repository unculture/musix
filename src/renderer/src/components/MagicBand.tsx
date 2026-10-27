import { useEffect, useState } from 'react'
import { newId, type AudioLayer, type Project } from '@shared/project'
import { magicPrompt, type MagicMode } from '@shared/music/magic'
import { analyseBeat } from '@/audio/analyse'
import { aiMusic } from '@/lib/ai'
import { celebrate } from '@/lib/celebrate'
import { speak } from '@/lib/speech'
import { useProject } from '@/state/project'
import { BigButton } from './BigButton'

// "Magic band": a studio-sounding backing track from the music model, lined up with her song,
// with her editable guide tune on top. Plus an optional sung demo.

const NAMES: Record<MagicMode, string> = { band: 'Magic band', sung: 'Sung demo' }
type Source = 'mine' | MagicMode

const BUSY = [
  'Calling the magic band…',
  'They are tuning up…',
  'Rehearsing your song…',
  'Recording in the studio…',
  'Mixing it all together…',
  'Almost ready…'
]

const layerFor = (p: Project, mode: MagicMode): AudioLayer | undefined =>
  p.layers.find((l) => l.kind === 'ai' && l.name === NAMES[mode])

function currentSource(p: Project): Source {
  if (layerFor(p, 'sung') && !layerFor(p, 'sung')!.muted) return 'sung'
  if (layerFor(p, 'band') && !layerFor(p, 'band')!.muted) return 'band'
  return 'mine'
}

/** Switch between her own band, the magic band and the sung demo by muting the rest. */
function withSource(p: Project, source: Source): Project {
  const plan = p.plan!
  const backing = source === 'mine'
  return {
    ...p,
    layers: p.layers.map((l) =>
      l.kind === 'ai' ? { ...l, muted: l.name !== NAMES[source as MagicMode] } : l
    ),
    plan: {
      ...plan,
      parts: plan.parts.map((part) =>
        part.role === 'melody'
          ? {
              ...part,
              muted: source === 'sung',
              volume: backing ? Math.max(part.volume, 0.6) : 0.45
            }
          : { ...part, muted: !backing }
      )
    }
  }
}

export function MagicBand(): React.JSX.Element {
  const project = useProject((s) => s.project)!
  const update = useProject((s) => s.update)
  const [busy, setBusy] = useState<MagicMode | null>(null)
  const [msg, setMsg] = useState(0)
  const source = currentSource(project)

  useEffect(() => {
    if (!busy) return
    const t = setInterval(() => setMsg((m) => Math.min(m + 1, BUSY.length - 1)), 6000)
    return () => clearInterval(t)
  }, [busy])

  const generate = async (mode: MagicMode): Promise<void> => {
    if (!project.plan) return
    setBusy(mode)
    setMsg(0)
    speak(
      mode === 'band'
        ? 'Calling the magic band! This takes about a minute.'
        : 'Finding a singer! This takes about a minute.'
    )
    const file = await aiMusic(project.id, magicPrompt(project, mode))
    if (!file) return setBusy(null)
    const plan = project.plan
    let offset = 0
    let bpm = plan.bpm
    try {
      const beat = await analyseBeat(project.id, file, plan.bpm)
      // Close enough to what we asked for: follow the band's exact tempo and first beat.
      if (Math.abs(beat.bpm - plan.bpm) / plan.bpm <= 0.08 && beat.confidence > 0.3) {
        bpm = beat.bpm
        offset = -beat.firstBeat
      }
    } catch (e) {
      console.error(e)
    }
    update((p) => {
      const layer: AudioLayer = {
        id: newId(),
        kind: 'ai',
        name: NAMES[mode],
        file,
        offset,
        volume: 0.9,
        muted: false
      }
      const next = {
        ...p,
        plan: { ...p.plan!, bpm },
        layers: [...p.layers.filter((l) => !(l.kind === 'ai' && l.name === NAMES[mode])), layer]
      }
      return withSource(next, mode)
    })
    setBusy(null)
    celebrate()
    speak(
      mode === 'band'
        ? 'The magic band is ready! Press play.'
        : 'Your sung demo is ready! Press play.'
    )
  }

  if (busy) {
    return (
      <div className="magic card" role="status">
        <div className="make__notes" aria-hidden>
          <span>🪄</span>
          <span>🎻</span>
          <span>🥁</span>
        </div>
        <p className="make__msg">{BUSY[msg]}</p>
      </div>
    )
  }

  const hasBand = Boolean(layerFor(project, 'band'))
  const hasSung = Boolean(layerFor(project, 'sung'))

  return (
    <div className="magic card">
      <div className="magic__sources">
        <BigButton
          icon="🎹"
          label="My band"
          variant={source === 'mine' ? 'solid' : 'soft'}
          color="var(--sky)"
          onClick={() => update((p) => withSource(p, 'mine'))}
        />
        <BigButton
          icon="🪄"
          label={hasBand ? 'Magic band' : 'Get a magic band'}
          variant={source === 'band' ? 'solid' : 'soft'}
          color="var(--grape)"
          onClick={() => (hasBand ? update((p) => withSource(p, 'band')) : generate('band'))}
          say={hasBand ? 'Magic band' : 'Get a magic band. Real-sounding musicians play your song.'}
        />
        <BigButton
          icon="🎙️"
          label={hasSung ? 'Sung demo' : 'Hear it sung'}
          variant={source === 'sung' ? 'solid' : 'soft'}
          color="var(--berry)"
          onClick={() => (hasSung ? update((p) => withSource(p, 'sung')) : generate('sung'))}
          say={hasSung ? 'Sung demo' : 'Hear someone sing your song'}
        />
      </div>
      {source !== 'mine' && (
        <button type="button" className="chip" onClick={() => generate(source)}>
          🔁 Try another {source === 'band' ? 'band' : 'singer'}
        </button>
      )}
    </div>
  )
}
