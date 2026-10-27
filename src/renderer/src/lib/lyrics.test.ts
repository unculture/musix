import { describe, expect, it } from 'vitest'
import { appendText, hasWords, linesToText, moveItem, newSection, textToLines } from './lyrics'

describe('lyrics helpers', () => {
  it('keeps line ids stable when text is edited', () => {
    const lines = textToLines('one\ntwo', [])
    const edited = textToLines('one!\ntwo\nthree', lines)
    expect(edited[0].id).toBe(lines[0].id)
    expect(edited[1].id).toBe(lines[1].id)
    expect(linesToText(edited)).toBe('one!\ntwo\nthree')
  })

  it('appends dictated text on a new line', () => {
    expect(appendText('', 'hello')).toBe('hello')
    expect(appendText('hi\n\n', 'there')).toBe('hi\nthere')
  })

  it('knows when there are words', () => {
    expect(hasWords([newSection('verse', '  ')])).toBe(false)
    expect(hasWords([newSection('verse', 'la la')])).toBe(true)
  })

  it('moves items within bounds', () => {
    expect(moveItem([1, 2, 3], 0, 1)).toEqual([2, 1, 3])
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3])
  })
})
