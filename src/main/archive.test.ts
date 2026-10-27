import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createProject } from '@shared/project'

vi.mock('electron', () => ({ app: { getPath: () => tmpdir() }, shell: { trashItem: vi.fn() } }))

const dir = mkdtempSync(join(tmpdir(), 'musix-archive-'))
beforeAll(() => {
  process.env['MUSIX_SONGS_DIR'] = dir
})
afterAll(() => rmSync(dir, { recursive: true, force: true }))

describe('.musix archives', async () => {
  const store = await import('./projects')
  const archive = await import('./archive')

  it('round-trips a song with its audio as a new copy', async () => {
    const p = { ...createProject(), title: 'Cat Disco' }
    await store.saveProject(p)
    await store.writeAudio(p.id, 'hum.webm', new Uint8Array([9, 8, 7]))
    const zip = await archive.packProject(p.id)
    const imported = await archive.importArchive(zip)
    expect(imported.id).not.toBe(p.id)
    expect(imported.title).toBe('Cat Disco')
    expect(Array.from(await store.readAudio(imported.id, 'hum.webm'))).toEqual([9, 8, 7])
  })

  it('rejects files that are not songs', async () => {
    const { zipSync, strToU8 } = await import('fflate')
    await expect(archive.importArchive(zipSync({ 'hello.txt': strToU8('hi') }))).rejects.toThrow()
  })
})
