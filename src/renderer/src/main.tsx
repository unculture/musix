import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Tone from 'tone'
import App from './App'
import { buildSong } from './audio/build'
import { usePlayer } from './audio/player'
import { useProject } from './state/project'

// Handy for poking at the engine from DevTools.
Object.assign(window, { __musixDebug: { Tone, buildSong, usePlayer, useProject } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
