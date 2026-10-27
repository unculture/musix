import { create } from 'zustand'

export interface Toast {
  id: number
  icon: string
  text: string
}

interface ToastState {
  toasts: Toast[]
  show: (text: string, icon?: string) => void
  dismiss: (id: number) => void
}

let nextId = 1

// Friendly messages only — never "error". Something going wrong is the app's problem, not hers.
export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  show: (text, icon = '💡') => {
    const id = nextId++
    set({ toasts: [...get().toasts, { id, icon, text }] })
    setTimeout(() => get().dismiss(id), 6000)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) })
}))

export const toast = (text: string, icon?: string): void => useToasts.getState().show(text, icon)
