import { contextBridge, ipcRenderer } from 'electron'
import type { MusixApi } from '@shared/api'

const api: MusixApi = {
  platform: process.platform,
  versions: { app: process.env['npm_package_version'] ?? '', electron: process.versions.electron },
  updates: {
    onReady: (callback) => {
      const listener = (_e: Electron.IpcRendererEvent, version: string): void => callback(version)
      ipcRenderer.on('update-ready', listener)
      return () => ipcRenderer.removeListener('update-ready', listener)
    },
    restartNow: () => ipcRenderer.invoke('app:restartToUpdate')
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    setKey: (key) => ipcRenderer.invoke('settings:setKey', key),
    testKey: (key) => ipcRenderer.invoke('settings:testKey', key),
    setModels: (models) => ipcRenderer.invoke('settings:setModels', models),
    setMagicPerDay: (n) => ipcRenderer.invoke('settings:setMagicPerDay', n),
    setVoice: (voice) => ipcRenderer.invoke('settings:setVoice', voice)
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
    showInFolder: (path) => ipcRenderer.invoke('files:showInFolder', path),
    exportSong: (id, title) => ipcRenderer.invoke('files:exportSong', id, title),
    importSong: () => ipcRenderer.invoke('files:importSong'),
    takeImported: () => ipcRenderer.invoke('files:takeImported'),
    onSongImported: (callback) => {
      const listener = (): void => callback()
      ipcRenderer.on('song-imported', listener)
      return () => ipcRenderer.removeListener('song-imported', listener)
    }
  },
  ai: {
    chat: (req) => ipcRenderer.invoke('ai:chat', req),
    transcribe: (req) => ipcRenderer.invoke('ai:transcribe', req),
    music: (projectId, prompt) => ipcRenderer.invoke('ai:music', projectId, prompt),
    cover: (projectId, prompt) => ipcRenderer.invoke('ai:cover', projectId, prompt),
    speak: (text) => ipcRenderer.invoke('ai:speak', text)
  }
}

contextBridge.exposeInMainWorld('musix', api)
