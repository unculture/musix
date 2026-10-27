import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type FontChoice = 'lexend' | 'dyslexic'

interface PrefsState {
  font: FontChoice
  readOnHover: boolean
  tourDone: boolean
  /** Screens whose tip has already been spoken automatically. */
  heard: string[]
  setFont: (font: FontChoice) => void
  setReadOnHover: (on: boolean) => void
  finishTour: () => void
  markHeard: (screen: string) => void
  restartTour: () => void
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      font: 'lexend',
      readOnHover: true,
      tourDone: false,
      heard: [],
      setFont: (font) => set({ font }),
      setReadOnHover: (readOnHover) => set({ readOnHover }),
      finishTour: () => set({ tourDone: true }),
      markHeard: (screen) =>
        set((s) => ({ heard: s.heard.includes(screen) ? s.heard : [...s.heard, screen] })),
      restartTour: () => set({ tourDone: false, heard: [] })
    }),
    { name: 'musix-prefs' }
  )
)
