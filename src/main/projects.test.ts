import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createProject } from '@shared/project'

vi.mock('electron', () => ({ app: { getPath: () => tmpdir() }, shell: { trashItem: vi.fn() } }))

const dir = mkdtempSync(join(tmpdir(), 'musix-test-'))
beforeAll(() => {
  process.env['MUSIX_SONGS_DIR'] = dir
})
afterAll(() => rmSync(dir, { recursive: true, force: true }))

describe('projects store', async () => {
  const store = await import('./projects')

  it('saves, lists and loads projects', async () => {
    const p = { ...createProject(), title: 'Stars' }
    await store.saveProject(p)
    const list = await store.listProjects()
    expect(list.map((s) => s.title)).toContain('Stars')
    expect(await store.loadProject(p.id)).toEqual(p)
  })

  it('duplicates a project including its audio', async () => {
    const p = createProject()
    await store.saveProject(p)
    await store.writeAudio(p.id, 'hum.webm', new Uint8Array([1, 2, 3]))
    const copy = await store.duplicateProject(p.id)
    expect(copy.id).not.toBe(p.id)
    expect(Array.from(await store.readAudio(copy.id, 'hum.webm'))).toEqual([1, 2, 3])
  })

  it('rejects path tricks', async () => {
    await expect(store.loadProject('../etc')).rejects.toThrow()
    const p = createProject()
    await store.saveProject(p)
    expect(await store.writeAudio(p.id, '../../evil.txt', new Uint8Array([1]))).toBe('evil.txt')
  })
})
