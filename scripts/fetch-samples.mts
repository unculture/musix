// Downloads the instrument and drum samples Musix bundles into resources/samples.
// Run with: node --experimental-strip-types scripts/fetch-samples.mts
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  DRUM_KITS,
  DRUM_SOUNDS,
  REGISTER_NOTES,
  SAMPLE_SOURCES,
  VOICES
} from '../src/shared/music/samples.ts'

const out = join(import.meta.dirname, '..', 'resources', 'samples')
const jobs: { url: string; file: string }[] = []

for (const voice of Object.values(VOICES)) {
  if (voice.kind !== 'sampled') continue
  for (const note of REGISTER_NOTES[voice.register]) {
    jobs.push({
      url: `${SAMPLE_SOURCES.gm}/${voice.gm}-mp3/${note}.mp3`,
      file: join(out, voice.gm, `${note}.mp3`)
    })
  }
}
for (const { folder } of new Set(Object.values(DRUM_KITS))) {
  if (!folder) continue
  for (const sound of DRUM_SOUNDS) {
    jobs.push({
      url: `${SAMPLE_SOURCES.drums}/${folder}/${sound}.mp3`,
      file: join(out, 'drums', folder, `${sound}.mp3`)
    })
  }
}

const unique = [...new Map(jobs.map((j) => [j.file, j])).values()].filter(
  (j) => !existsSync(j.file)
)
console.log(`Fetching ${unique.length} samples…`)
let failed = 0
for (let i = 0; i < unique.length; i += 8) {
  await Promise.all(
    unique.slice(i, i + 8).map(async ({ url, file }) => {
      const res = await fetch(url)
      if (!res.ok) {
        failed++
        console.error(`✗ ${res.status} ${url}`)
        return
      }
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, Buffer.from(await res.arrayBuffer()))
    })
  )
}
console.log(failed ? `Done with ${failed} failures.` : 'Done.')
process.exit(failed ? 1 : 0)
