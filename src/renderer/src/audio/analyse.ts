import { estimateBeat, type BeatGrid } from '@shared/audio/tempo'

/** Find the beat in one of the song's audio files. */
export async function analyseBeat(
  projectId: string,
  file: string,
  expectedBpm: number
): Promise<BeatGrid & { duration: number }> {
  const data = await (
    await fetch(`musix://song/${projectId}/${encodeURIComponent(file)}`)
  ).arrayBuffer()
  const ctx = new AudioContext()
  const audio = await ctx.decodeAudioData(data)
  await ctx.close()
  const mono = new Float32Array(audio.length)
  for (let c = 0; c < audio.numberOfChannels; c++) {
    const ch = audio.getChannelData(c)
    for (let i = 0; i < ch.length; i++) mono[i] += ch[i] / audio.numberOfChannels
  }
  return { ...estimateBeat(mono, audio.sampleRate, expectedBpm), duration: audio.duration }
}
