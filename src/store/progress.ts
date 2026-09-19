import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AtomProgress, Grade, IslandResult } from '@/types'
import { applyAnswer } from '@/engine/srs'
import { todayKey } from '@/lib/utils'

export interface Settings {
  theme: 'dark' | 'light'
  unlockAll: boolean
  sound: boolean
  hardMode: boolean
}

interface ProgressState {
  atoms: Record<string, AtomProgress>
  lessonsRead: Record<string, number>
  islands: Record<string, IslandResult>
  xp: number
  streak: number
  lastActive: string | null
  settings: Settings
  dirty: Record<string, true>
  userId: string | null

  answer: (atomId: string, grade: Grade) => void
  markRead: (lessonId: string) => void
  recordExam: (islandId: string, pct: number, pass: number) => void
  addXp: (n: number) => void
  touchStreak: () => void
  setSettings: (s: Partial<Settings>) => void
  setUser: (id: string | null) => void
  hydrateRemote: (data: Partial<Pick<ProgressState, 'atoms' | 'lessonsRead' | 'islands' | 'xp' | 'streak' | 'lastActive'>>) => void
  clearDirty: (ids: string[]) => void
  reset: () => void
}

const defaults = {
  atoms: {} as Record<string, AtomProgress>,
  lessonsRead: {} as Record<string, number>,
  islands: {} as Record<string, IslandResult>,
  xp: 0,
  streak: 0,
  lastActive: null as string | null,
  dirty: {} as Record<string, true>,
  userId: null as string | null,
  settings: { theme: 'dark', unlockAll: false, sound: true, hardMode: false } as Settings,
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...defaults,

      answer: (atomId, grade) =>
        set((s) => ({
          atoms: { ...s.atoms, [atomId]: applyAnswer(s.atoms[atomId], grade) },
          dirty: { ...s.dirty, [atomId]: true },
          xp: s.xp + (grade === 'first' ? 4 : grade === 'retry' ? 2 : 0),
        })),

      markRead: (lessonId) =>
        set((s) =>
          s.lessonsRead[lessonId]
            ? s
            : { lessonsRead: { ...s.lessonsRead, [lessonId]: Date.now() }, xp: s.xp + 6 },
        ),

      recordExam: (islandId, pct, pass) =>
        set((s) => {
          const prev = s.islands[islandId]
          return {
            islands: {
              ...s.islands,
              [islandId]: {
                best: Math.max(prev?.best ?? 0, pct),
                attempts: (prev?.attempts ?? 0) + 1,
                passed: (prev?.passed ?? false) || pct >= pass,
                u: Date.now(),
              },
            },
            xp: s.xp + Math.round(pct / 2),
          }
        }),

      addXp: (n) => set((s) => ({ xp: s.xp + n })),

      touchStreak: () =>
        set((s) => {
          const today = todayKey()
          if (s.lastActive === today) return s
          const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
          return { lastActive: today, streak: s.lastActive === yesterday ? s.streak + 1 : 1 }
        }),

      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      setUser: (id) => set({ userId: id }),

      hydrateRemote: (data) =>
        set((s) => {
          const atoms = { ...s.atoms }
          for (const [id, remote] of Object.entries(data.atoms ?? {})) {
            const local = atoms[id]
            if (!local || remote.u > local.u) atoms[id] = remote
          }
          const islands = { ...s.islands }
          for (const [id, remote] of Object.entries(data.islands ?? {})) {
            const local = islands[id]
            if (!local || remote.u > local.u) islands[id] = remote
          }
          return {
            atoms,
            islands,
            lessonsRead: { ...(data.lessonsRead ?? {}), ...s.lessonsRead },
            xp: Math.max(s.xp, data.xp ?? 0),
            streak: Math.max(s.streak, data.streak ?? 0),
            lastActive: s.lastActive ?? data.lastActive ?? null,
          }
        }),

      clearDirty: (ids) =>
        set((s) => {
          const d = { ...s.dirty }
          for (const id of ids) delete d[id]
          return { dirty: d }
        }),

      reset: () => set({ ...defaults, settings: get().settings }),
    }),
    { name: 'cyberpath-v1', version: 1 },
  ),
)
