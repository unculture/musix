import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Tone from 'tone'
import * as tf from '@tensorflow/tfjs'
import App from './App'
import { buildSong } from './audio/build'
import { usePlayer } from './audio/player'
import { detectNotes } from './audio/pitch'
import { humToMelody } from '@shared/music/hum'
import { useNav } from './state/nav'
import { useProject } from './state/project'

// Handy for poking at the engine from DevTools.
Object.assign(window, {
  __musixDebug: { Tone, tf, buildSong, usePlayer, useProject, useNav, detectNotes, humToMelody }
})

// Long-press on a touch screen would open a context menu — only allow it in text boxes.
window.addEventListener('contextmenu', (e) => {
  if (!(e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement))
    e.preventDefault()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
