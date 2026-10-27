import { app, net, protocol } from 'electron'
import { join, normalize, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { songsDir } from './projects'

// musix://samples/<path>      → bundled instrument samples
// musix://song/<id>/<file>    → a song's recorded / generated audio
// A custom scheme lets the renderer fetch() local audio the same way in dev and when packaged.

export function registerSchemes(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'musix',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        corsEnabled: true
      }
    }
  ])
}

export const samplesDir = (): string =>
  app.isPackaged
    ? join(process.resourcesPath, 'resources', 'samples')
    : join(app.getAppPath(), 'resources', 'samples')

function inside(root: string, rel: string): string | null {
  const full = normalize(join(root, rel))
  return full.startsWith(normalize(root) + sep) ? full : null
}

export function handleProtocol(): void {
  protocol.handle('musix', async (request) => {
    const url = new URL(request.url)
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '')
    let file: string | null = null
    if (url.host === 'samples') file = inside(samplesDir(), rel)
    else if (url.host === 'song') {
      const [id, ...rest] = rel.split('/')
      if (/^[a-z0-9]+$/i.test(id)) file = inside(join(songsDir(), id, 'audio'), rest.join('/'))
    }
    if (!file) return new Response('Not found', { status: 404 })
    const res = await net.fetch(pathToFileURL(file).toString())
    return new Response(res.body, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'audio/mpeg',
        'Access-Control-Allow-Origin': '*'
      }
    })
  })
}
