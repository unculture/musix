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

export function speak(text: string): void {
  const synth = window.speechSynthesis
  if (!synth || !text.trim()) return
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = pickVoice()
  if (voice) utterance.voice = voice
  utterance.rate = 0.92
  utterance.pitch = 1.05
  synth.speak(utterance)
}

export function stopSpeaking(): void {
  window.speechSynthesis?.cancel()
}
