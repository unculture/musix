// Read-aloud helper. Every piece of text in Musix can be spoken, because reading is hard work
// for a dyslexic child — hearing it should always be one tap (or a long hover) away.

let preferredVoice: SpeechSynthesisVoice | null = null

function pickVoice(): SpeechSynthesisVoice | null {
  if (preferredVoice) return preferredVoice
  const voices = window.speechSynthesis?.getVoices() ?? []
  const english = voices.filter((v) => v.lang.startsWith('en'))
  const favourites = [
    'Samantha',
    'Karen',
    'Moira',
    'Serena',
    'Daniel',
    'Microsoft Sonia',
    'Microsoft Libby',
    'Google UK English Female'
  ]
  preferredVoice =
    favourites.map((name) => english.find((v) => v.name.includes(name))).find(Boolean) ??
    english.find((v) => v.lang === 'en-GB') ??
    english[0] ??
    null
  return preferredVoice
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    preferredVoice = null
    pickVoice()
  }
}

// While the microphone is open we keep quiet, or Mo's voice ends up in her recording.
let micsOpen = 0

/** Call when a microphone opens; call the returned function when it closes. */
export function micOpened(): () => void {
  micsOpen++
  stopSpeaking()
  let closed = false
  return () => {
    if (!closed) micsOpen--
    closed = true
  }
}

let current: { key: string; done: Promise<void> } | null = null
const sameWords = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Read `text` aloud. Resolves when it has finished (or was cut off). */
export function speak(text: string): Promise<void> {
  const synth = window.speechSynthesis
  if (!synth || !text.trim() || micsOpen > 0) return Promise.resolve()
  // Asked to say what we're already saying (e.g. a button and Mo at once): don't start again.
  const key = sameWords(text)
  if (current?.key === key) return current.done
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = pickVoice()
  if (voice) utterance.voice = voice
  utterance.rate = 0.92
  utterance.pitch = 1.05
  const done = new Promise<void>((resolve) => {
    const finish = (): void => {
      clearTimeout(timer)
      if (current?.done === done) current = null
      resolve()
    }
    // Chromium doesn't always fire 'end', so don't wait longer than the words could take.
    const timer = setTimeout(finish, 2000 + text.length * 120)
    utterance.onend = utterance.onerror = finish
    synth.speak(utterance)
  })
  current = { key, done }
  return done
}

export function stopSpeaking(): void {
  current = null
  window.speechSynthesis?.cancel()
}
