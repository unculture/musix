import type { Project } from '../project'
import { MOOD_INFO, presetById } from '../styles'
import { instrumentInfo } from './instruments'

export type MagicMode = 'band' | 'sung'

/** Prompt for the music model, built from the song plan so the track fits her song. */
export function magicPrompt(project: Project, mode: MagicMode): string {
  const plan = project.plan!
  const preset = presetById(project.style.preset)
  const seconds = (bars: number): number => Math.round((bars * plan.beatsPerBar * 60) / plan.bpm)
  const structure = plan.sections.map((s) => `${s.kind} (${s.bars} bars)`).join(', ')
  const total = seconds(plan.sections.reduce((t, s) => t + s.bars, 0))
  const instruments = plan.parts
    .filter((p) => p.role !== 'melody' && p.instrument !== 'none')
    .map((p) => instrumentInfo(p.role, p.instrument)?.label.toLowerCase())
    .filter(Boolean)
    .join(', ')
  const lyrics = plan.sections
    .map((s) => project.lyrics.find((l) => l.id === s.lyricSectionId))
    .filter(Boolean)
    .map(
      (l) =>
        `[${l!.kind}]\n${l!.lines
          .map((x) => x.text.trim())
          .filter(Boolean)
          .join('\n')}`
    )
    .join('\n\n')

  return [
    `A ${preset ? preset.prompt : 'fun, catchy'} song${project.style.description.trim() ? ` — ${project.style.description.trim()}` : ''}.`,
    project.style.mood ? `Mood: ${MOOD_INFO[project.style.mood].label.toLowerCase()}.` : '',
    `Tempo exactly ${plan.bpm} BPM, steady and on the grid, in ${plan.key} ${plan.scale}. 4/4 time.`,
    `Chords: ${plan.sections.map((s) => s.chords.map((c) => c.symbol).join(' ')).join(' | ')}.`,
    instruments ? `Instruments: ${instruments}.` : '',
    `Structure: ${structure}. About ${total} seconds long. Start playing straight away on the first beat.`,
    mode === 'band'
      ? 'Instrumental backing track only — absolutely no vocals, no singing, no humming, no choir. Leave space for a young singer.'
      : `Sung by a bright, friendly young female voice, clear and easy to sing along to. Family friendly. Lyrics:\n${lyrics}`
  ]
    .filter(Boolean)
    .join('\n')
}

/** Prompt for a cover picture. Always child-safe and without text (models misspell words). */
export function coverPrompt(project: Project): string {
  const preset = presetById(project.style.preset)
  const words = project.lyrics
    .flatMap((s) => s.lines.map((l) => l.text.trim()))
    .filter(Boolean)
    .slice(0, 6)
    .join(' / ')
  return [
    `Square album cover illustration for a children's song called "${project.title}".`,
    words ? `The song is about: ${words}` : '',
    preset ? `Music style: ${preset.label}.` : '',
    project.style.mood ? `Feeling: ${MOOD_INFO[project.style.mood].label.toLowerCase()}.` : '',
    'Bright, colourful, playful and friendly picture-book style. Completely child-safe.',
    'Absolutely no text, letters, numbers or words anywhere in the image.'
  ]
    .filter(Boolean)
    .join('\n')
}
