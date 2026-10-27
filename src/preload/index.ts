import { contextBridge } from 'electron'
import type { MusixApi } from '@shared/api'

const api: MusixApi = {
  platform: process.platform,
  versions: { app: process.env['npm_package_version'] ?? '', electron: process.versions.electron }
}

contextBridge.exposeInMainWorld('musix', api)
