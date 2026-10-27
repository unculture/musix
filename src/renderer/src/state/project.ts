import { create } from 'zustand'
import { createProject, type Project, type ProjectSummary } from '@shared/project'
import { toast } from './toast'

const AUTOSAVE_MS = 600
/** Changes closer together than this (typing, dragging a slider) undo as one step. */
const UNDO_GROUP_MS = 800
const UNDO_LIMIT = 60

interface ProjectState {
  project: Project | null
  songs: ProjectSummary[]
  past: Project[]
  future: Project[]
  undo: () => void
  redo: () => void
  refresh: () => Promise<void>
  create: () => Promise<Project>
  open: (id: string) => Promise<Project | null>
  close: () => Promise<void>
  /** Change the open project; it's saved automatically a moment later. */
  update: (change: (p: Project) => Project) => void
  flush: () => Promise<void>
  remove: (id: string) => Promise<void>
  duplicate: (id: string) => Promise<void>
  rename: (id: string, title: string) => Promise<void>
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let lastChange = 0

async function save(project: Project): Promise<void> {
  try {
    await window.musix.projects.save(project)
  } catch (e) {
    console.error(e)
    toast("I couldn't save your song just now. I'll keep trying!", '💾')
  }
}

function scheduleSave(project: Project): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    save(project)
  }, AUTOSAVE_MS)
}

export const useProject = create<ProjectState>()((set, get) => ({
  project: null,
  songs: [],
  past: [],
  future: [],

  undo: () => {
    const { past, project, future } = get()
    if (!project || !past.length) return
    const previous = past[past.length - 1]
    set({ project: previous, past: past.slice(0, -1), future: [project, ...future] })
    lastChange = 0
    scheduleSave(previous)
  },

  redo: () => {
    const { past, project, future } = get()
    if (!project || !future.length) return
    const next = future[0]
    set({ project: next, past: [...past, project], future: future.slice(1) })
    lastChange = 0
    scheduleSave(next)
  },

  refresh: async () => set({ songs: await window.musix.projects.list() }),

  create: async () => {
    await get().flush()
    const project = createProject()
    await save(project)
    set({ project, past: [], future: [] })
    return project
  },

  open: async (id) => {
    await get().flush()
    try {
      const project = await window.musix.projects.load(id)
      set({ project, past: [], future: [] })
      return project
    } catch (e) {
      console.error(e)
      toast("Hmm, I couldn't open that song.", '📂')
      return null
    }
  },

  close: async () => {
    await get().flush()
    set({ project: null, past: [], future: [] })
    await get().refresh()
  },

  update: (change) => {
    const current = get().project
    if (!current) return
    const project = { ...change(current), updatedAt: new Date().toISOString() }
    const now = Date.now()
    const grouped = now - lastChange < UNDO_GROUP_MS
    lastChange = now
    set({
      project,
      past: grouped ? get().past : [...get().past, current].slice(-UNDO_LIMIT),
      future: []
    })
    scheduleSave(project)
  },

  flush: async () => {
    if (!saveTimer) return
    clearTimeout(saveTimer)
    saveTimer = null
    const { project } = get()
    if (project) await save(project)
  },

  remove: async (id) => {
    if (get().project?.id === id) set({ project: null })
    await window.musix.projects.delete(id)
    await get().refresh()
  },

  duplicate: async (id) => {
    await get().flush()
    await window.musix.projects.duplicate(id)
    await get().refresh()
  },

  rename: async (id, title) => {
    const clean = title.trim() || 'My song'
    if (get().project?.id === id) {
      get().update((p) => ({ ...p, title: clean }))
      await get().flush()
    } else {
      const p = await window.musix.projects.load(id)
      await window.musix.projects.save({ ...p, title: clean, updatedAt: new Date().toISOString() })
    }
    await get().refresh()
  }
}))

// Don't lose the last change when the window closes.
window.addEventListener('beforeunload', () => {
  useProject.getState().flush()
})
