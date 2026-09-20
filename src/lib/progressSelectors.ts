import type { AtomProgress } from '@/types'
import { useProgress } from '@/store/progress'
import { useBank } from '@/store/bank'
import { mastered } from '@/engine/srs'
import { islandOrder, islandMetaById, type IslandMeta } from '@/content'
import { moduleKey } from '@/content/bank'

export const PASS_SCORE = 80

/** Цвета трёх колец. Один источник правды для острова и для карты. */
export const RING_COLORS = {
  theory: 'var(--primary)',
  terms: 'var(--violet)',
  exam: 'var(--accent)',
} as const

/** Процент острова считается по id его вопросов, сам модуль грузить не надо. */
export function masteryOf(atomIds: string[], atoms: Record<string, AtomProgress>): number {
  if (!atomIds.length) return 0
  let sum = 0
  for (const id of atomIds) sum += mastered(atoms[id])
  return sum / atomIds.length
}

export interface IslandRings {
  /** Прочитанные уроки. */
  theory: number
  /** Владение терминами раздела. */
  terms: number
  /** Вопросы курса раздела плюс лучший результат экзамена модуля. */
  exam: number
  /** Среднее по тем кольцам, которые у раздела вообще есть. */
  total: number
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export function useIslandStats(meta: IslandMeta | undefined) {
  const atoms = useProgress((s) => s.atoms)
  const lessonsRead = useProgress((s) => s.lessonsRead)
  const result = useProgress((s) => (meta ? s.islands[meta.id] : undefined))
  const runs = useBank((s) => s.runs)

  const empty: IslandRings = { theory: 0, terms: 0, exam: 0, total: 0 }

  if (!meta) {
    return {
      rings: empty, mastery: 0, readCount: 0, readTotal: 0, started: false,
      weak: [] as string[], weakTerms: [] as string[], weakQuiz: [] as string[],
      exam: undefined, bestExam: undefined as number | undefined, done: false,
    }
  }

  const mastery = masteryOf(meta.atomIds, atoms)
  const readCount = Math.min(
    Object.keys(lessonsRead).filter((id) => id.startsWith(meta.id + '.')).length,
    meta.lessons,
  )

  const isWeak = (id: string) => {
    const p = atoms[id]
    return !!p && p.seen > 0 && (p.wrong > 0 || p.m < 3)
  }

  // --- три кольца ---
  const theory = meta.lessons ? readCount / meta.lessons : 0
  const terms = masteryOf(meta.termIds, atoms)

  const bestExam = runs[moduleKey(meta.moduleId)]?.best
  const examParts: number[] = []
  if (meta.quizIds.length) examParts.push(masteryOf(meta.quizIds, atoms))
  if (bestExam !== undefined) examParts.push(bestExam / 100)
  const exam = avg(examParts)

  const totalParts = [theory]
  if (meta.termIds.length) totalParts.push(terms)
  if (meta.quizIds.length || bestExam !== undefined) totalParts.push(exam)

  const rings: IslandRings = { theory, terms, exam, total: avg(totalParts) }

  return {
    rings,
    /** Старый показатель: среднее владение всеми атомами. Нужен для разблокировки. */
    mastery,
    readCount,
    readTotal: meta.lessons,
    started: meta.atomIds.some((id) => atoms[id]?.seen),
    weak: meta.atomIds.filter(isWeak),
    weakTerms: meta.termIds.filter(isWeak),
    weakQuiz: meta.quizIds.filter(isWeak),
    exam: result,
    bestExam,
    done: rings.total >= 0.9 || ((result?.passed ?? false) && mastery >= 0.6),
  }
}

/** Остров открыт, если предыдущий освоен наполовину, сдан экзамен или включён режим «всё открыто». */
export function useUnlocked(): Set<string> {
  const atoms = useProgress((s) => s.atoms)
  const islands = useProgress((s) => s.islands)
  const unlockAll = useProgress((s) => s.settings.unlockAll)

  const open = new Set<string>()
  if (unlockAll) { for (const id of islandOrder) open.add(id); return open }

  let allow = true
  for (const id of islandOrder) {
    if (allow) open.add(id)
    const meta = islandMetaById.get(id)
    const passed = islands[id]?.passed || (meta ? masteryOf(meta.atomIds, atoms) >= 0.5 : true)
    allow = allow && passed
  }
  return open
}
