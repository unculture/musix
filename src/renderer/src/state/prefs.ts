import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type FontChoice = 'lexend' | 'dyslexic'

interface PrefsState {
  font: FontChoice
  readOnHover: boolean
  setFont: (font: FontChoice) => void
  setReadOnHover: (on: boolean) => void
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      font: 'lexend',
      readOnHover: true,
      setFont: (font) => set({ font }),
      setReadOnHover: (readOnHover) => set({ readOnHover })
    }),
    { name: 'musix-prefs' }
  )
)
