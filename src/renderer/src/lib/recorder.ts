import { useCallback, useEffect, useRef, useState } from 'react'

export interface Recording {
  blob: Blob
  /** Container format for the AI, e.g. 'webm'. */
  format: string
  durationMs: number
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

/**
 * Microphone recorder with a live level (0–1) for bouncy visuals.
 * Echo cancellation etc. are on for speech; pass `raw` for humming/singing so pitch isn't mangled.
 */
export function useRecorder({ raw = false }: { raw?: boolean } = {}): {
  recording: boolean
  level: number
  start: () => Promise<boolean>
  stop: () => Promise<Recording | null>
} {
  const [recording, setRecording] = useState(false)
  const [level, setLevel] = useState(0)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const began = useRef(0)
  const raf = useRef(0)
  const ctx = useRef<AudioContext | null>(null)

  const cleanup = useCallback(() => {
    cancelAnimationFrame(raf.current)
    recorder.current?.stream.getTracks().forEach((t) => t.stop())
    ctx.current?.close()
    ctx.current = null
    setLevel(0)
  }, [])

  useEffect(() => cleanup, [cleanup])

  const start = useCallback(async () => {
    if (!(await window.musix.media.askMic())) return false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: raw
          ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
          : { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      })
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : ''
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunks.current = []
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      rec.start(250)
      recorder.current = rec
      began.current = performance.now()

      ctx.current = new AudioContext()
      const analyser = ctx.current.createAnalyser()
      analyser.fftSize = 512
      ctx.current.createMediaStreamSource(stream).connect(analyser)
      const data = new Uint8Array(analyser.fftSize)
      const tick = (): void => {
        analyser.getByteTimeDomainData(data)
        let peak = 0
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128)
        setLevel((l) => l * 0.6 + peak * 0.4)
        raf.current = requestAnimationFrame(tick)
      }
      tick()
      setRecording(true)
      return true
    } catch (e) {
      console.error(e)
      cleanup()
      return false
    }
  }, [raw, cleanup])

  const stop = useCallback(async (): Promise<Recording | null> => {
    const rec = recorder.current
    if (!rec || rec.state === 'inactive') return null
    const done = new Promise<void>((resolve) => (rec.onstop = () => resolve()))
    rec.stop()
    await done
    cleanup()
    setRecording(false)
    recorder.current = null
    const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' })
    return { blob, format: 'webm', durationMs: performance.now() - began.current }
  }, [cleanup])

  return { recording, level, start, stop }
}
