import { useRef, useState, type CSSProperties } from 'react'
import * as Tone from 'tone'
import type { Note } from '@shared/project'
import { humToMelody } from '@shared/music/hum'
import { presetById, tempoFor } from '@shared/styles'
import { countIn, startClicks } from '@/audio/metronome'
import { detectNotes, warmUp } from '@/audio/pitch'
import { BigButton } from '@/components/BigButton'
import { NoteBlobs } from '@/components/NoteBlobs'
import { StepScreen } from '@/components/StepScreen'
import { useRecorder, type Recording } from '@/lib/recorder'
import { speak } from '@/lib/speech'
import { useProject } from '@/state/project'
import { toast } from '@/state/toast'

type Stage = 'idle' | 'counting' | 'recording' | 'thinking' | 'heard'

const MIN_NOTES = 3

async function playNotes(notes: Note[], bpm: number): Promise<number> {
  await Tone.start()
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.02, release: 0.3 }
  }).toDestination()
  const spb = 60 / bpm
  const now = Tone.now() + 0.1
  for (const n of notes)
    synth.triggerAttackRelease(
      Tone.Frequency(n.pitch, 'midi').toFrequency(),
      n.duration * spb * 0.95,
      now + n.start * spb,
      n.velocity
    )
  const length = Math.max(...notes.map((n) => n.start + n.duration)) * spb
  setTimeout(() => synth.dispose(), (length + 1) * 1000)
  return length
}

export function HumScreen(): React.JSX.Element {
  const project = useProject((s) => s.project)!
  const update = useProject((s) => s.update)
  const bpm = project.plan?.bpm ?? tempoFor(presetById(project.style.preset), project.style.speed)
  const { level, start, stop } = useRecorder({ raw: true })
  const [stage, setStage] = useState<Stage>(project.hum ? 'heard' : 'idle')
  const [notes, setNotes] = useState<Note[]>(project.hum?.notes ?? [])
  const [take, setTake] = useState<Recording | null>(null)
  const [saved, setSaved] = useState(Boolean(project.hum))
  const stopClicks = useRef<(() => void) | null>(null)

  const record = async (): Promise<void> => {
    setStage('counting')
    // Get the tune detector ready during the count-in. Doing it when the screen opens froze
    // the buttons for a few seconds on slower laptops.
    warmUp()
    // Finish talking before the mic opens.
    await speak('Get ready… hum after four clicks.')
    await countIn(bpm)
    if (!(await start())) {
      toast('I need to use the microphone. Ask a grown-up to allow it.', '🎙️')
      setStage('idle')
      return
    }
    stopClicks.current = startClicks(bpm)
    setStage('recording')
  }

  const finish = async (): Promise<void> => {
    stopClicks.current?.()
    const rec = await stop()
    if (!rec) return setStage('idle')
    setStage('thinking')
    try {
      const melody = humToMelody(
        await detectNotes(rec.blob),
        bpm,
        project.plan ? { key: project.plan.key, scale: project.plan.scale } : {}
      )
      if (melody.notes.length < MIN_NOTES) {
        toast(
          "I couldn't quite hear a tune. Try humming a little louder, close to the computer.",
          '👂'
        )
        return setStage('idle')
      }
      setNotes(melody.notes)
      setTake(rec)
      setSaved(false)
      setStage('heard')
      speak('I heard your tune! Have a listen.')
    } catch (e) {
      console.error(e)
      toast("Hmm, my ears got muddled. Let's try that again.", '🤖')
      setStage('idle')
    }
  }

  const useIt = async (): Promise<void> => {
    if (!take) return
    const file = await window.musix.projects.writeAudio(
      project.id,
      `hum-${Date.now()}.webm`,
      new Uint8Array(await take.blob.arrayBuffer())
    )
    update((p) => ({ ...p, hum: { file, notes, bpm } }))
    setSaved(true)
    speak(
      project.plan
        ? 'Saved! Press Make it again to put your tune in the song.'
        : 'Saved! I will use your tune in the song.'
    )
  }

  const hearHum = (): void => {
    const url = take
      ? URL.createObjectURL(take.blob)
      : project.hum
        ? `musix://song/${project.id}/${project.hum.file}`
        : null
    if (url) new Audio(url).play()
  }

  const remove = (): void => {
    update((p) => ({ ...p, hum: undefined }))
    setNotes([])
    setTake(null)
    setSaved(false)
    setStage('idle')
  }

  const help: Record<Stage, string> = {
    idle: 'Got a tune in your head? Press the button, wait for four clicks, then hum it! Or skip this bit.',
    counting: 'Get ready… hum after four clicks!',
    recording: "I'm listening! Hum your tune, then press Done.",
    thinking: 'Listening to your tune…',
    heard: saved
      ? 'This is your tune! You can hum a new one if you like.'
      : 'Here is what I heard. Do you want to use it?'
  }

  return (
    <StepScreen step="hum" title="Hum a tune" help={help[stage]}>
      <div className="hum">
        {(stage === 'idle' || stage === 'counting') && (
          <BigButton
            icon="🎤"
            label={stage === 'counting' ? 'Get ready…' : 'Hum a tune'}
            size="xl"
            color="var(--sky)"
            onClick={record}
            disabled={stage === 'counting'}
          />
        )}

        {stage === 'recording' && (
          <>
            <div
              className="hum__meter"
              style={{ '--level': Math.min(1, level * 3).toFixed(3) } as CSSProperties}
              aria-hidden
            >
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i} style={{ animationDelay: `${i * 0.07}s` }} />
              ))}
            </div>
            <BigButton icon="⏹️" label="Done" size="lg" color="var(--berry)" onClick={finish} />
          </>
        )}

        {stage === 'thinking' && (
          <div className="make__notes" aria-hidden>
            <span>👂</span>
            <span>🎶</span>
            <span>👂</span>
          </div>
        )}

        {stage === 'heard' && (
          <>
            <NoteBlobs notes={notes} />
            <div className="hum__actions">
              <BigButton
                icon="🗣️"
                label="My humming"
                variant="soft"
                color="var(--sky)"
                onClick={hearHum}
              />
              <BigButton
                icon="🎹"
                label="The notes"
                variant="soft"
                color="var(--grape)"
                onClick={() => playNotes(notes, bpm)}
              />
              <BigButton
                icon="🔁"
                label="Hum again"
                variant="soft"
                color="var(--ink-soft)"
                onClick={record}
              />
              {saved ? (
                <BigButton
                  icon="🗑️"
                  label="No tune"
                  variant="soft"
                  color="var(--coral)"
                  onClick={remove}
                  say="Don't use a hummed tune"
                />
              ) : (
                <BigButton icon="✅" label="Use it!" color="var(--leaf)" onClick={useIt} />
              )}
            </div>
          </>
        )}
      </div>
    </StepScreen>
  )
}
