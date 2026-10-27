import { create } from 'zustand'

export type StepId = 'words' | 'style' | 'hum' | 'make' | 'play'
export type Screen = 'home' | 'settings' | StepId

export interface StepInfo {
  id: StepId
  icon: string
  label: string
  color: string
  soft: string
  /** Text colour to use on top of `color`. */
  ink: string
}

// The song-making journey. Colours are used consistently so each step is recognisable at a glance.
export const STEPS: StepInfo[] = [
  {
    id: 'words',
    icon: '✏️',
    label: 'Words',
    color: 'var(--berry)',
    soft: 'var(--berry-soft)',
    ink: '#fff'
  },
  {
    id: 'style',
    icon: '🎨',
    label: 'Style',
    color: 'var(--sun)',
    soft: 'var(--sun-soft)',
    ink: 'var(--ink)'
  },
  {
    id: 'hum',
    icon: '🎤',
    label: 'Hum',
    color: 'var(--sky)',
    soft: 'var(--sky-soft)',
    ink: '#fff'
  },
  {
    id: 'make',
    icon: '✨',
    label: 'Make',
    color: 'var(--grape)',
    soft: 'var(--grape-soft)',
    ink: '#fff'
  },
  {
    id: 'play',
    icon: '🎧',
    label: 'Play',
    color: 'var(--leaf)',
    soft: 'var(--leaf-soft)',
    ink: '#fff'
  }
]

interface NavState {
  screen: Screen
  go: (screen: Screen) => void
}

export const useNav = create<NavState>()((set) => ({
  screen: 'home',
  go: (screen) => set({ screen })
}))
