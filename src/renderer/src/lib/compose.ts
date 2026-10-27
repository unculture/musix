import type { Project, SongPlan } from '@shared/project'
import {
  composerMessages,
  composerSchema,
  fallbackPlan,
  normaliseAiPlan,
  type AiPlan
} from '@shared/music/composer'
import { aiChat } from './ai'

export interface Composed {
  plan: SongPlan
  title?: string
  usedAi: boolean
}

/** Ask the AI composer for a song; if it can't help, write one ourselves so she always gets music. */
export async function composeSong(project: Project): Promise<Composed> {
  const res = await aiChat({
    messages: composerMessages(project),
    schema: { name: 'song_plan', schema: composerSchema() },
    temperature: 0.8
  })
  if (res?.json) {
    try {
      const { plan, title } = normaliseAiPlan(res.json as AiPlan, project)
      return { plan, title: title || undefined, usedAi: true }
    } catch (e) {
      console.error('AI plan could not be repaired', e)
    }
  }
  return { plan: fallbackPlan(project), usedAi: false }
}
