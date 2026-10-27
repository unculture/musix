import { describe, expect, it } from 'vitest'
import { presetById, STYLE_PRESETS, tempoFor } from './styles'

describe('style presets', () => {
  it('have unique ids', () => {
    expect(new Set(STYLE_PRESETS.map((p) => p.id)).size).toBe(STYLE_PRESETS.length)
  })

  it('map speed to a tempo that rises with speed', () => {
    const pop = presetById('pop')
    const tempos = [1, 2, 3, 4, 5].map((s) => tempoFor(pop, s))
    expect([...tempos].sort((a, b) => a - b)).toEqual(tempos)
    expect(tempos[2]).toBeGreaterThanOrEqual(100)
    expect(tempos[2]).toBeLessThanOrEqual(124)
  })
})
