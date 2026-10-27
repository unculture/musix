import { app } from 'electron'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { speech } from './openrouter'

// Natural read-aloud voice. Most of what Musix says is the same few hundred phrases, so each one is
// generated once and kept on disk: after that it plays instantly, offline, and costs nothing.

const MAX_CHARS = 500
const MAX_FILES = 2000
/** Bump when the prompt changes so old recordings are replaced. */
const VERSION = 1

const dir = (): string => join(app.getPath('userData'), 'voice')
const inFlight = new Map<string, Promise<Buffer>>()
/** Phrases the voice wouldn't read faithfully this session; don't pay to try again. */
const refused = new Set<string>()

export async function speakNatural(
  key: string,
  text: string,
  voice: string,
  model: string
): Promise<Buffer> {
  const line = text.trim()
  if (line.length > MAX_CHARS) throw new Error('VOICE_TOO_LONG')
  const id = createHash('sha1').update(`${VERSION}|${model}|${voice}|${line}`).digest('hex')
  const file = join(dir(), `${id}.wav`)
  if (existsSync(file)) return readFileSync(file)
  if (refused.has(id)) throw new Error('VOICE_MISMATCH')
  let job = inFlight.get(id)
  if (!job) {
    job = speech(key, line, voice, model)
      .then(async (wav) => {
        mkdirSync(dir(), { recursive: true })
        await writeFile(file, wav)
        prune()
        return wav
      })
      .catch((e) => {
        if (e instanceof Error && e.message === 'VOICE_MISMATCH') refused.add(id)
        throw e
      })
      .finally(() => inFlight.delete(id))
    inFlight.set(id, job)
  }
  return job
}

/** Keep the cache from growing forever (e.g. reading out lots of different lyrics). */
function prune(): void {
  const files = readdirSync(dir())
  if (files.length <= MAX_FILES) return
  files
    .map((f) => ({ f, t: statSync(join(dir(), f)).mtimeMs }))
    .sort((a, b) => a.t - b.t)
    .slice(0, files.length - MAX_FILES)
    .forEach(({ f }) => unlinkSync(join(dir(), f)))
}
