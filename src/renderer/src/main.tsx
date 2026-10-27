import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Tone from 'tone'
import * as tf from '@tensorflow/tfjs'
import App from './App'
import { buildSong } from './audio/build'
import { usePlayer } from './audio/player'
import { detectNotes } from './audio/pitch'
import { humToMelody } from '@shared/music/hum'
import { useProject } from './state/project'

// Handy for poking at the engine from DevTools.
Object.assign(window, {
  __musixDebug: { Tone, tf, buildSong, usePlayer, useProject, detectNotes, humToMelody }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
