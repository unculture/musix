import { encodeMp3, type Mp3Meta } from '@shared/audio/mp3'

// Encoding a few minutes of audio takes a moment, so it happens off the UI thread.
self.onmessage = (
  e: MessageEvent<{ left: Float32Array; right: Float32Array; sampleRate: number; meta: Mp3Meta }>
) => {
  const { left, right, sampleRate, meta } = e.data
  const mp3 = encodeMp3(left, right, sampleRate, {
    meta,
    onProgress: (fraction) => self.postMessage({ type: 'progress', fraction })
  })
  self.postMessage({ type: 'done', mp3 }, { transfer: [mp3.buffer] })
}
