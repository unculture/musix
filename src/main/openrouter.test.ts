import { describe, expect, it } from 'vitest'
import {
  buildChatBody,
  buildSpeechBody,
  buildTranscribeRequest,
  parseJsonReply,
  pcmToWav,
  saidExactly
} from './openrouter'

describe('buildChatBody', () => {
  it('uses the default model and adds a strict json_schema response format', () => {
    const body = buildChatBody(
      {
        messages: [{ role: 'user', content: 'hi' }],
        schema: { name: 'x', schema: { type: 'object' } }
      },
      'model/a'
    )
    expect(body.model).toBe('model/a')
    expect(body.response_format).toEqual({
      type: 'json_schema',
      json_schema: { name: 'x', strict: true, schema: { type: 'object' } }
    })
  })
})

describe('buildTranscribeRequest', () => {
  it('sends the audio as input_audio with the given format', () => {
    const req = buildTranscribeRequest(
      { audio: 'AAAA', format: 'webm', hint: 'Song lyrics.' },
      'model/b'
    )
    const content = req.messages[0].content as Array<{ type: string }>
    expect(req.model).toBe('model/b')
    expect(content[1]).toEqual({
      type: 'input_audio',
      input_audio: { data: 'AAAA', format: 'webm' }
    })
    expect(JSON.stringify(content[0])).toContain('Song lyrics.')
  })
})

describe('parseJsonReply', () => {
  it('parses plain, fenced and chatty JSON', () => {
    expect(parseJsonReply('{"a":1}')).toEqual({ a: 1 })
    expect(parseJsonReply('```json\n{"a":2}\n```')).toEqual({ a: 2 })
    expect(parseJsonReply('Here you go: {"a":3} enjoy')).toEqual({ a: 3 })
  })
})

describe('speech', () => {
  it('asks for the words only, in the chosen voice', () => {
    const body = buildSpeechBody('Bin this song?', 'marin', 'openai/gpt-audio-mini')
    expect(body.audio).toEqual({ voice: 'marin', format: 'pcm16' })
    expect(JSON.stringify(body.messages)).toContain('«Bin this song?»')
  })

  it('accepts a faithful reading and rejects an ad-lib', () => {
    expect(
      saidExactly('"Get ready... hum after four clicks."', 'Get ready… hum after four clicks.')
    ).toBe(true)
    expect(saidExactly('Let’s go!', "Let's go!")).toBe(true)
    expect(saidExactly('Sure! Bin this song?', 'Bin this song?')).toBe(false)
  })

  it('wraps PCM in a playable WAV header', () => {
    const wav = pcmToWav(Buffer.alloc(48000))
    expect(wav.subarray(0, 4).toString()).toBe('RIFF')
    expect(wav.readUInt32LE(24)).toBe(24000)
    expect(wav.readUInt32LE(40)).toBe(48000)
    expect(wav.length).toBe(48044)
  })
})
