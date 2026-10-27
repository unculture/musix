import { useEffect, useState } from 'react'
import { speak, stopSpeaking } from '@/lib/speech'
import { usePrefs } from '@/state/prefs'
import { BigButton } from './BigButton'
import { SpeakButton } from './Speakable'

const SLIDES = [
  { icon: '👾', text: "Hi! I'm Mo, your music friend. Let's make songs together!" },
  {
    icon: '✏️ 🎨 🎤',
    text: 'You write the words, pick a style, and hum a tune if you like. You can type, or just talk to me.'
  },
  {
    icon: '✨ 🎧 💾',
    text: 'Then I turn it into music! You can sing along, change anything, and save it to play anywhere.'
  },
  {
    icon: '🔊',
    text: 'If reading is tricky, press the speaker, or press and hold anything, and I will read it to you.'
  }
]

// A short, spoken welcome the first time Musix opens.
export function Tour(): React.JSX.Element | null {
  const { tourDone, finishTour } = usePrefs()
  const [i, setI] = useState(0)
  const slide = SLIDES[i]

  useEffect(() => {
    if (!tourDone) speak(slide.text)
  }, [tourDone, slide.text])

  if (tourDone) return null

  const done = (): void => {
    stopSpeaking()
    finishTour()
  }

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label="Welcome">
      <div className="tour__card">
        <div className="tour__icon" aria-hidden>
          {slide.icon}
        </div>
        <p className="tour__text">
          {slide.text} <SpeakButton text={slide.text} />
        </p>
        <div className="tour__dots" aria-hidden>
          {SLIDES.map((_, d) => (
            <span key={d} className={d === i ? 'tour__dot tour__dot--on' : 'tour__dot'} />
          ))}
        </div>
        <div className="tour__buttons">
          <BigButton icon="⏭️" label="Skip" variant="soft" color="var(--ink-soft)" onClick={done} />
          {i < SLIDES.length - 1 ? (
            <BigButton icon="➡️" label="Next" color="var(--grape)" onClick={() => setI(i + 1)} />
          ) : (
            <BigButton icon="🎵" label="Let's go!" color="var(--berry)" onClick={done} />
          )}
        </div>
      </div>
    </div>
  )
}
