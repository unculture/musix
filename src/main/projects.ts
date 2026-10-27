import { app, shell } from 'electron'
import { existsSync } from 'node:fs'
import { cp, mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { newId, parseProject, summarise, type Project, type ProjectSummary } from '@shared/project'

// Songs live in Documents/Musix/Songs/<id>/ — project.json plus an audio/ folder —
// so they're easy for a parent to find and back up.
export function songsDir(): string {
  return process.env['MUSIX_SONGS_DIR'] ?? join(app.getPath('documents'), 'Musix', 'Songs')
}

const projectDir = (id: string): string => {
  if (!/^[a-z0-9]+$/i.test(id)) throw new Error('Bad project id')
  return join(songsDir(), id)
}
const projectFile = (id: string): string => join(projectDir(id), 'project.json')
const audioDir = (id: string): string => join(projectDir(id), 'audio')

export async function listProjects(): Promise<ProjectSummary[]> {
  await mkdir(songsDir(), { recursive: true })
  const ids = await readdir(songsDir())
  const summaries = await Promise.all(
    ids.map(async (id) => {
      try {
        return summarise(await loadProject(id))
      } catch {
        return null
      }
    })
  )
  return summaries
    .filter((s): s is ProjectSummary => s !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function loadProject(id: string): Promise<Project> {
  return parseProject(JSON.parse(await readFile(projectFile(id), 'utf8')))
}

export async function saveProject(project: Project): Promise<void> {
  const valid = parseProject(project)
  await mkdir(projectDir(valid.id), { recursive: true })
  // Write then rename, so a crash mid-save never leaves a half-written song.
  const tmp = `${projectFile(valid.id)}.tmp`
  await writeFile(tmp, JSON.stringify(valid, null, 2))
  await rename(tmp, projectFile(valid.id))
}

export async function deleteProject(id: string): Promise<void> {
  // To the Trash / Recycle Bin rather than gone forever.
  if (existsSync(projectDir(id))) await shell.trashItem(projectDir(id))
}

export async function duplicateProject(id: string): Promise<Project> {
  const original = await loadProject(id)
  const copy: Project = {
    ...original,
    id: newId(),
    title: `${original.title} (copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  if (existsSync(audioDir(id))) await cp(audioDir(id), audioDir(copy.id), { recursive: true })
  await saveProject(copy)
  return copy
}

export async function writeAudio(id: string, name: string, data: Uint8Array): Promise<string> {
  await mkdir(audioDir(id), { recursive: true })
  const file = basename(name)
  await writeFile(join(audioDir(id), file), data)
  return file
}

export async function readAudio(id: string, file: string): Promise<Uint8Array> {
  return readFile(join(audioDir(id), basename(file)))
}
