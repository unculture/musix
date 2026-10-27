import { useState } from 'react'
import { ideasMessages, ideasSchema, type LyricIdeas as Ideas } from '@shared/music/ideas'
import { aiChat } from '@/lib/ai'
import { speak } from '@/lib/speech'
import { useProject } from '@/state/project'
import { useHoverSpeak } from './Speakable'

function IdeaChip({ text, onPick }: { text: string; onPick: () => void }): React.JSX.Element {
  const hover = useHoverSpeak(text)
  return (
    <button type="button" className="chip idea" onClick={onPick} {...hover}>
      {text}
    </button>
  )
}

// Rhymes and next-line ideas for one lyric box. Tapping one adds it; undo takes it away.
export function LyricIdeas({
  text,
  onAdd
}: {
  text: string
  onAdd: (addition: string, asNewLine: boolean) => void
}): React.JSX.Element {
  const project = useProject((s) => s.project)!
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ideas, setIdeas] = useState<Ideas | null>(null)

  const load = async (): Promise<void> => {
    setOpen(true)
    setBusy(true)
    const res = await aiChat({
      messages: ideasMessages(project, text),
      schema: { name: 'lyric_ideas', schema: ideasSchema },
      temperature: 0.9
    })
    setBusy(false)
    const json = res?.json as Ideas | undefined
    if (json) {
      const lastWord = (text.trim().split(/\s+/).pop() ?? '').replace(/[^a-z']/gi, '').toLowerCase()
      const rhymes = [...new Set(json.rhymes.map((w) => w.trim()))].filter(
        (w) => w && w.toLowerCase() !== lastWord
      )
      setIdeas({ rhymes: rhymes.slice(0, 8), nextLines: json.nextLines.slice(0, 3) })
      speak('Here are some ideas. Tap one to add it.')
    } else setOpen(false)
  }

  if (!open) {
    return (
      <button type="button" className="chip" onClick={load}>
        💡 Ideas
      </button>
    )
  }

  return (
    <div className="ideas">
      {busy && <span className="ideas__busy">💭 Thinking of ideas…</span>}
      {ideas && (
        <>
          <div className="ideas__row">
            <span className="ideas__label">🎯 Rhymes</span>
            {ideas.rhymes.map((w) => (
              <IdeaChip key={w} text={w} onPick={() => onAdd(w, false)} />
            ))}
          </div>
          <div className="ideas__row">
            <span className="ideas__label">➡️ Next line</span>
            {ideas.nextLines.map((l) => (
              <IdeaChip key={l} text={l} onPick={() => onAdd(l, true)} />
            ))}
          </div>
          <div className="ideas__row">
            <button type="button" className="chip" onClick={load}>
              🔁 More ideas
            </button>
            <button type="button" className="chip" onClick={() => setOpen(false)}>
              ✖️ Close
            </button>
          </div>
        </>
      )}
    </div>
  )
}
