import type { Project } from '../project'
import { presetById } from '../styles'

// "Help me write": suggestions she can choose from. Never rewrites her words.

export interface LyricIdeas {
  rhymes: string[]
  nextLines: string[]
}

export const ideasSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['rhymes', 'nextLines'],
  properties: {
    rhymes: {
      type: 'array',
      items: { type: 'string' },
      description: '8 simple words that rhyme with the last word'
    },
    nextLines: { type: 'array', items: { type: 'string' }, description: '3 possible next lines' }
  }
}

export function ideasMessages(
  project: Pick<Project, 'lyrics' | 'style' | 'title'>,
  sectionText: string
): { role: 'system' | 'user'; content: string }[] {
  const lines = sectionText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const last = lines[lines.length - 1] ?? ''
  const lastWord =
    last
      .split(/\s+/)
      .pop()
      ?.replace(/[^a-z']/gi, '') ?? ''
  const whole = project.lyrics
    .flatMap((s) => s.lines.map((l) => l.text.trim()))
    .filter(Boolean)
    .join('\n')
  return [
    {
      role: 'system',
      content: [
        'You help an 11-year-old who is dyslexic write song lyrics. She chooses; you only suggest.',
        'Use simple, common, easy-to-read words. Keep it kind, fun and family friendly.',
        'Rhymes: 8 single words that rhyme (or nearly rhyme) with the target word, easiest first, no repeats of the word itself.',
        'Next lines: 3 short options that could follow her last line, matching its length and rhythm, about her song’s topic, and ending on a word that rhymes with her previous line where it makes sense.'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        `Song: "${project.title}"${presetById(project.style.preset) ? ` (${presetById(project.style.preset)!.label})` : ''}`,
        `Whole song so far:\n${whole || '(nothing yet)'}`,
        `This part:\n${lines.join('\n') || '(empty)'}`,
        lastWord ? `Rhyme with: "${lastWord}"` : 'Suggest rhymes for a word from the song title.'
      ].join('\n\n')
    }
  ]
}
