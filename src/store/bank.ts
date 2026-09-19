import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface BankStat { right: number; wrong: number; last: 'right' | 'wrong'; u: number }
export interface BankRun { best: number; attempts: number; u: number }

interface BankState {
  seen: Record<string, BankStat>
  runs: Record<string, BankRun>
  answer: (qid: string, correct: boolean) => void
  recordRun: (groupKey: string, pct: number) => void
  reset: () => void
}

/**
 * Прогресс по банку вопросов живёт отдельно от уровней терминов
 * и на процент островов не влияет.
 */
export const useBank = create<BankState>()(
  persist(
    (set) => ({
      seen: {},
      runs: {},

      answer: (qid, correct) =>
        set((s) => {
          const cur = s.seen[qid]
          return {
            seen: {
              ...s.seen,
              [qid]: {
                right: (cur?.right ?? 0) + (correct ? 1 : 0),
                wrong: (cur?.wrong ?? 0) + (correct ? 0 : 1),
                last: correct ? 'right' : 'wrong',
                u: Date.now(),
              },
            },
          }
        }),

      recordRun: (groupKey, pct) =>
        set((s) => {
          const prev = s.runs[groupKey]
          return {
            runs: {
              ...s.runs,
              [groupKey]: { best: Math.max(prev?.best ?? 0, pct), attempts: (prev?.attempts ?? 0) + 1, u: Date.now() },
            },
          }
        }),

      reset: () => set({ seen: {}, runs: {} }),
    }),
    { name: 'cyberpath-bank-v1', version: 1 },
  ),
)

export const wrongIds = (seen: Record<string, BankStat>) =>
  Object.entries(seen).filter(([, v]) => v.last === 'wrong').map(([id]) => id)
