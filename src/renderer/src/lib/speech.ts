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

// The natural voice comes from the AI (main keeps each phrase on disk after the first time).
// If it's off, offline or slow, the computer's own voice reads instead.
const NATURAL_WAIT_MS = 2500
const clips = new Map<string, Promise<Blob | null>>()

function naturalClip(text: string): Promise<Blob | null> {
  const line = text.trim()
  let clip = clips.get(line)
  if (!clip) {
    clip = window.musix.ai
      .speak(line)
      .then((r) => (r.ok ? new Blob([r.value as BlobPart], { type: 'audio/wav' }) : null))
      .catch(() => null)
    clips.set(line, clip)
    // Don't remember failures: the voice might be switched on, or the internet come back.
    clip.then((blob) => blob || clips.delete(line))
    if (clips.size > 300) clips.delete(clips.keys().next().value as string)
  }
  return clip
}

/** The voice was changed: fetch clips afresh. */
export function forgetVoiceClips(): void {
  clips.clear()
}

/** Start fetching a line's voice before it's needed, e.g. when a finger or mouse lands on it. */
export function prepareSpeech(text: string): void {
  if (text.trim()) void naturalClip(text)
}

type Stopper = (stop: () => void) => void

function playClip(blob: Blob, onStop: Stopper): Promise<void> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    const finish = (): void => {
      audio.pause()
      URL.revokeObjectURL(url)
      resolve()
    }
    audio.onended = audio.onerror = finish
    onStop(finish)
    audio.play().catch(finish)
  })
}

function playSystem(text: string, onStop: Stopper): Promise<void> {
  const synth = window.speechSynthesis
  if (!synth) return Promise.resolve()
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = pickVoice()
  if (voice) utterance.voice = voice
  utterance.rate = 0.92
  utterance.pitch = 1.05
  return new Promise((resolve) => {
    const finish = (): void => {
      clearTimeout(timer)
      resolve()
    }
    // Chromium doesn't always fire 'end', so don't wait longer than the words could take.
    const timer = setTimeout(finish, 2000 + text.length * 120)
    utterance.onend = utterance.onerror = finish
    onStop(() => {
      synth.cancel()
      finish()
    })
    synth.speak(utterance)
  })
}

let current: { key: string; done: Promise<void>; stop: () => void } | null = null
const sameWords = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
const wait = (ms: number): Promise<null> => new Promise((r) => setTimeout(() => r(null), ms))

/** Read `text` aloud. Resolves when it has finished (or was cut off). */
export function speak(text: string): Promise<void> {
  if (!text.trim() || micsOpen > 0) return Promise.resolve()
  // Asked to say what we're already saying (e.g. a button and Mo at once): don't start again.
  const key = sameWords(text)
  if (current?.key === key) return current.done
  stopSpeaking()
  let stopped = false
  let stopPlaying = (): void => {}
  const onStop: Stopper = (stop) => (stopPlaying = stop)
  const line = {
    key,
    stop: () => {
      stopped = true
      stopPlaying()
    },
    done: (async () => {
      const clip = await Promise.race([naturalClip(text), wait(NATURAL_WAIT_MS)])
      if (stopped || micsOpen > 0) return
      await (clip ? playClip(clip, onStop) : playSystem(text, onStop))
    })().finally(() => {
      if (current === line) current = null
    })
  }
  current = line
  return line.done
}

export function stopSpeaking(): void {
  current?.stop()
  current = null
  window.speechSynthesis?.cancel()
}
