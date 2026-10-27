import { newId, type LyricLine, type LyricSection, type SectionKind } from '@shared/project'

export const SECTION_INFO: Record<
  SectionKind,
  { icon: string; label: string; color: string; soft: string }
> = {
  intro: { icon: '🌅', label: 'Intro', color: 'var(--sky)', soft: 'var(--sky-soft)' },
  verse: { icon: '📖', label: 'Verse', color: 'var(--grape)', soft: 'var(--grape-soft)' },
  chorus: { icon: '🎉', label: 'Chorus', color: 'var(--berry)', soft: 'var(--berry-soft)' },
  bridge: { icon: '🌉', label: 'Bridge', color: 'var(--leaf)', soft: 'var(--leaf-soft)' },
  outro: { icon: '🌙', label: 'Outro', color: 'var(--coral)', soft: 'var(--coral-soft)' }
}

export function newSection(kind: SectionKind, text = ''): LyricSection {
  return { id: newId(), kind, lines: textToLines(text, []) }
}

export function linesToText(lines: LyricLine[]): string {
  return lines.map((l) => l.text).join('\n')
}

/** Re-split edited text into lines, keeping ids stable by position so references survive edits. */
export function textToLines(text: string, previous: LyricLine[]): LyricLine[] {
  if (!text) return []
  return text.split('\n').map((t, i) => ({ id: previous[i]?.id ?? newId(), text: t }))
}

export function appendText(existing: string, addition: string): string {
  if (!existing.trim()) return addition
  return `${existing.replace(/\s+$/, '')}\n${addition}`
}

export function hasWords(sections: LyricSection[]): boolean {
  return sections.some((s) => s.lines.some((l) => l.text.trim()))
}

export function moveItem<T>(xs: T[], from: number, to: number): T[] {
  if (to < 0 || to >= xs.length) return xs
  const copy = [...xs]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}
