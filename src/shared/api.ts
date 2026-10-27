// The typed bridge exposed to the renderer as `window.musix`.
export interface MusixApi {
  platform: NodeJS.Platform
  versions: { app: string; electron: string }
}
