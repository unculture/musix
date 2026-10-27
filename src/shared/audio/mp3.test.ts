import { describe, expect, it } from 'vitest'
import { encodeMp3, id3 } from './mp3'

describe('encodeMp3', () => {
  it('encodes a stereo sine to a tagged MP3', () => {
    const rate = 44100
    const n = rate // one second
    const left = new Float32Array(n).map((_, i) => Math.sin((2 * Math.PI * 440 * i) / rate) * 0.5)
    const mp3 = encodeMp3(left, left, rate, { meta: { title: 'Stars 🌈', artist: 'Me' } })
    expect([...mp3.slice(0, 3)]).toEqual([0x49, 0x44, 0x33]) // "ID3"
    const tagSize = id3({ title: 'Stars 🌈', artist: 'Me' }).length
    // MPEG frame sync right after the tag.
    expect(mp3[tagSize]).toBe(0xff)
    expect(mp3[tagSize + 1] & 0xe0).toBe(0xe0)
    // ~192 kbps for 1 s ≈ 24 KB.
    expect(mp3.length).toBeGreaterThan(15_000)
    expect(mp3.length).toBeLessThan(40_000)
  })
})

describe('id3 cover', () => {
  it('adds an APIC frame', () => {
    const tag = id3({ title: 'x', cover: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]) })
    expect(new TextDecoder().decode(tag)).toContain('APIC')
    expect(new TextDecoder().decode(tag)).toContain('image/png')
  })
})
