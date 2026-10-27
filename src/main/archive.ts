import { existsSync } from 'node:fs'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate'
import { newId, parseProject, type Project } from '@shared/project'
import { loadProject, saveProject, songsDir, writeAudio } from './projects'

// A .musix file is a zip: project.json plus an audio/ folder. Easy to back up, email or move.

export async function packProject(id: string): Promise<Uint8Array> {
  const project = await loadProject(id)
  const files: Record<string, Uint8Array> = {
    'project.json': strToU8(JSON.stringify(project, null, 2))
  }
  const audio = join(songsDir(), id, 'audio')
  if (existsSync(audio)) {
    for (const name of await readdir(audio))
      files[`audio/${name}`] = new Uint8Array(await readFile(join(audio, name)))
  }
  // Audio is already compressed; don't waste time re-compressing it.
  return zipSync(files, { level: 0 })
}

export async function exportProject(id: string, path: string): Promise<void> {
  await writeFile(path, await packProject(id))
}

/** Unpack a .musix file into a new song (always a fresh id, so it never overwrites one). */
export async function importArchive(data: Uint8Array): Promise<Project> {
  const files = unzipSync(data)
  if (!files['project.json']) throw new Error('Not a Musix song file')
  const original = parseProject(JSON.parse(strFromU8(files['project.json'])))
  const project: Project = { ...original, id: newId(), updatedAt: new Date().toISOString() }
  for (const [name, bytes] of Object.entries(files)) {
    if (name.startsWith('audio/') && !name.endsWith('/'))
      await writeAudio(project.id, basename(name), bytes)
  }
  await saveProject(project)
  return project
}

export async function importFile(path: string): Promise<Project> {
  return importArchive(new Uint8Array(await readFile(path)))
}
