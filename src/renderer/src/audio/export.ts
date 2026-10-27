import * as Tone from 'tone'
import type { Project } from '@shared/project'
import { buildSong } from './build'

const SAMPLE_RATE = 44100

/** Render the whole song (music + audio layers) without playing it. `duration` comes from the loaded player. */
export async function renderSong(project: Project, duration: number): Promise<AudioBuffer> {
  if (!project.plan) throw new Error('No song yet')
  const plan = project.plan
  const buffer = await Tone.Offline(
    async ({ transport }) => {
      transport.bpm.value = plan.bpm
      await buildSong(plan, transport, { projectId: project.id, layers: project.layers })
      transport.start()
    },
    duration,
    2,
    SAMPLE_RATE
  )
  return buffer.get() as AudioBuffer
}

export function encodeInWorker(
  buffer: AudioBuffer,
  title: string,
  onProgress?: (f: number) => void,
  cover?: Uint8Array
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./mp3.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (
      e: MessageEvent<{ type: 'progress'; fraction: number } | { type: 'done'; mp3: Uint8Array }>
    ) => {
      if (e.data.type === 'progress') onProgress?.(e.data.fraction)
      else {
        resolve(e.data.mp3)
        worker.terminate()
      }
    }
    worker.onerror = (e) => {
      reject(e)
      worker.terminate()
    }
    const left = buffer.getChannelData(0).slice()
    const right = (
      buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : buffer.getChannelData(0)
    ).slice()
    worker.postMessage(
      {
        left,
        right,
        sampleRate: buffer.sampleRate,
        meta: { title, artist: 'Made with Musix', cover }
      },
      [left.buffer, right.buffer]
    )
  })
}
