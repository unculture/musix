import { contextBridge, ipcRenderer } from 'electron'
import type { MusixApi } from '@shared/api'

const api: MusixApi = {
  platform: process.platform,
  versions: { app: process.env['npm_package_version'] ?? '', electron: process.versions.electron },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    setKey: (key) => ipcRenderer.invoke('settings:setKey', key),
    testKey: (key) => ipcRenderer.invoke('settings:testKey', key),
    setModels: (models) => ipcRenderer.invoke('settings:setModels', models)
  },
  ai: {
    chat: (req) => ipcRenderer.invoke('ai:chat', req),
    transcribe: (req) => ipcRenderer.invoke('ai:transcribe', req)
  }
}

contextBridge.exposeInMainWorld('musix', api)
