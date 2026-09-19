import type { AtomProgress, Grade } from '@/types'

const MIN = 60_000
const DAY = 86_400_000

/** Интервалы Лейтнера по уровням мастерства 0..5. */
export const INTERVALS = [10 * MIN, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY]

export const MAX_MASTERY = 5

export function emptyProgress(): AtomProgress {
  return { m: 0, due: 0, right: 0, wrong: 0, seen: 0, u: 0 }
}

/**
 * first  — ответил с первого раза: уровень растёт, интервал полный.
 * retry  — ответил только во втором заходе: уровень стоит на месте, вернём раньше.
 * failed — не ответил и во втором заходе: уровень падает.
 */
export function applyAnswer(p: AtomProgress | undefined, grade: Grade): AtomProgress {
  const cur = p ?? emptyProgress()
  const now = Date.now()
  const m =
    grade === 'first' ? Math.min(MAX_MASTERY, cur.m + 1)
    : grade === 'failed' ? Math.max(0, cur.m - 1)
    : cur.m
  const wait = grade === 'retry' ? INTERVALS[Math.max(0, m - 1)] : INTERVALS[m]
  return {
    m,
    due: now + wait,
    right: cur.right + (grade === 'first' ? 1 : 0),
    wrong: cur.wrong + (grade === 'first' ? 0 : 1),
    seen: cur.seen + 1,
    u: now,
  }
}

export function isDue(p: AtomProgress | undefined, now = Date.now()): boolean {
  if (!p || p.seen === 0) return true
  return p.due <= now
}

/** Доля освоенности атома 0..1 — из неё складывается кольцо прогресса острова. */
export function mastered(p: AtomProgress | undefined): number {
  if (!p) return 0
  return Math.min(1, p.m / MAX_MASTERY)
}
