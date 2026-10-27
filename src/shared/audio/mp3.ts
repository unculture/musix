import { Mp3Encoder } from '@breezystack/lamejs'

export interface Mp3Meta {
  title?: string
  artist?: string
  /** Cover picture (PNG or JPEG bytes). */
  cover?: Uint8Array
}

const BLOCK = 1152

function toInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

/** A minimal ID3v2.3 tag so the song shows its name in music players. */
export function id3(meta: Mp3Meta): Uint8Array {
  const frames: Uint8Array[] = []
  const frame = (id: string, text: string): void => {
    // Encoding 1 = UTF-16 with BOM, so any characters (and emoji) survive.
    const body = new Uint8Array(3 + text.length * 2 + 2)
    body[0] = 1
    body[1] = 0xff
    body[2] = 0xfe
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i)
      body[3 + i * 2] = c & 0xff
      body[4 + i * 2] = c >> 8
    }
    const header = new Uint8Array(10)
    for (let i = 0; i < 4; i++) header[i] = id.charCodeAt(i)
    new DataView(header.buffer).setUint32(4, body.length)
    frames.push(header, body)
  }
  if (meta.title) frame('TIT2', meta.title)
  if (meta.artist) frame('TPE1', meta.artist)
  frame('TSSE', 'Musix')
  if (meta.cover?.length) {
    const png = meta.cover[0] === 0x89
    const mime = png ? 'image/png' : 'image/jpeg'
    // APIC: encoding, MIME type, NUL, picture type 3 (front cover), empty description, image data.
    const body = new Uint8Array(1 + mime.length + 1 + 1 + 1 + meta.cover.length)
    let o = 1
    for (let i = 0; i < mime.length; i++) body[o++] = mime.charCodeAt(i)
    body[o++] = 0
    body[o++] = 3
    body[o++] = 0
    body.set(meta.cover, o)
    const header = new Uint8Array(10)
    for (let i = 0; i < 4; i++) header[i] = 'APIC'.charCodeAt(i)
    new DataView(header.buffer).setUint32(4, body.length)
    frames.push(header, body)
  }
  const size = frames.reduce((t, f) => t + f.length, 0)
  const header = new Uint8Array([
    0x49,
    0x44,
    0x33,
    3,
    0,
    0,
    (size >> 21) & 0x7f,
    (size >> 14) & 0x7f,
    (size >> 7) & 0x7f,
    size & 0x7f
  ])
  return concat([header, ...frames])
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((t, p) => t + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

export function encodeMp3(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  opts: { kbps?: number; meta?: Mp3Meta; onProgress?: (fraction: number) => void } = {}
): Uint8Array {
  const encoder = new Mp3Encoder(2, sampleRate, opts.kbps ?? 192)
  const l = toInt16(left)
  const r = toInt16(right)
  const parts: Uint8Array[] = [id3(opts.meta ?? {})]
  for (let i = 0; i < l.length; i += BLOCK) {
    const chunk = encoder.encodeBuffer(l.subarray(i, i + BLOCK), r.subarray(i, i + BLOCK))
    if (chunk.length) parts.push(new Uint8Array(chunk))
    if (opts.onProgress && i % (BLOCK * 200) === 0) opts.onProgress(i / l.length)
  }
  const end = encoder.flush()
  if (end.length) parts.push(new Uint8Array(end))
  return concat(parts)
}
