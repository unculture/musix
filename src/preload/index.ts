import { contextBridge, ipcRenderer } from 'electron'
import type { MusixApi } from '@shared/api'

const api: MusixApi = {
  platform: process.platform,
  versions: { app: process.env['npm_package_version'] ?? '', electron: process.versions.electron },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    setKey: (key) => ipcRenderer.invoke('settings:setKey', key),
    testKey: (key) => ipcRenderer.invoke('settings:testKey', key),
    setModels: (models) => ipcRenderer.invoke('settings:setModels', models),
    setMagicPerDay: (n) => ipcRenderer.invoke('settings:setMagicPerDay', n)
  },
  media: {
    askMic: () => ipcRenderer.invoke('media:askMic')
  },
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    load: (id) => ipcRenderer.invoke('projects:load', id),
    save: (project) => ipcRenderer.invoke('projects:save', project),
    delete: (id) => ipcRenderer.invoke('projects:delete', id),
    duplicate: (id) => ipcRenderer.invoke('projects:duplicate', id),
    writeAudio: (id, name, data) => ipcRenderer.invoke('projects:writeAudio', id, name, data),
    readAudio: (id, file) => ipcRenderer.invoke('projects:readAudio', id, file)
  },
  files: {
    saveMp3: (data, name) => ipcRenderer.invoke('files:saveMp3', data, name),
    showInFolder: (path) => ipcRenderer.invoke('files:showInFolder', path)
  },
  ai: {
    chat: (req) => ipcRenderer.invoke('ai:chat', req),
    transcribe: (req) => ipcRenderer.invoke('ai:transcribe', req),
    music: (projectId, prompt) => ipcRenderer.invoke('ai:music', projectId, prompt)
  }
}

contextBridge.exposeInMainWorld('musix', api)
