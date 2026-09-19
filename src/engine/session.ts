import type { Atom, AtomProgress, Exercise, ExerciseFormat } from '@/types'
import { buildExercise, buildGroupExercises, buildPools, buildStack, formatForMastery, shuffle } from './generate'
import { isDue } from './srs'

export type SessionMode = 'learn' | 'flash' | 'exam' | 'review'

export interface SessionOptions {
  mode: SessionMode
  /** Сколько атомов взять. undefined = все (полное покрытие). */
  size?: number
  /** Добавлять групповые задания (пары и сортировка). */
  groups?: boolean
}

interface Ctx {
  atoms: Atom[]
  progress: Record<string, AtomProgress | undefined>
}

function priority(a: Atom, p: AtomProgress | undefined, now: number): number {
  const weight = a.weight ?? 2
  if (!p || p.seen === 0) return 1000 - weight * 10
  const overdue = Math.max(0, now - p.due)
  return 500 - p.m * 60 - weight * 10 - Math.min(200, overdue / 3_600_000)
}

/** Отбор атомов под сессию: сперва новые и просроченные, затем слабые. */
export function selectAtoms(ctx: Ctx, opts: SessionOptions): Atom[] {
  const now = Date.now()
  let pool = ctx.atoms

  if (opts.mode === 'review') {
    pool = pool.filter((a) => {
      const p = ctx.progress[a.id]
      return p && (p.wrong > 0 || p.m < 3)
    })
  } else if (opts.mode === 'learn') {
    const due = pool.filter((a) => isDue(ctx.progress[a.id], now))
    if (due.length >= 6) pool = due
  }

  const sorted = pool
    .map((a) => ({ a, k: priority(a, ctx.progress[a.id], now) }))
    .sort((x, y) => y.k - x.k)
    .map((x) => x.a)

  return opts.size ? sorted.slice(0, opts.size) : sorted
}

export function buildSession(ctx: Ctx, opts: SessionOptions): Exercise[] {
  const chosen = selectAtoms(ctx, opts)
  if (!chosen.length) return []

  const pools = buildPools(ctx.atoms)

  if (opts.mode === 'flash') {
    const out: Exercise[] = []
    for (const a of chosen) {
      const ex = buildExercise(a, 'flashcard', pools)
      if (ex) out.push(ex)
    }
    return out
  }

  const examMode = opts.mode === 'exam'
  const questions: Exercise[] = []

  for (const a of chosen) {
    const p = ctx.progress[a.id]
    const mastery = p?.m ?? 0
    let format: ExerciseFormat = formatForMastery(a, mastery, 'flashcard')
    if (format === 'flashcard') format = 'mcq_term'

    const ex = buildExercise(a, format, pools)
    if (ex) questions.push(ex)
    else {
      const fallback = buildExercise(a, 'mcq_term', pools) ?? buildExercise(a, 'mcq_def', pools)
      if (fallback) questions.push(fallback)
    }
  }

  if (opts.groups !== false && chosen.length >= 6) {
    const group = [
      ...buildGroupExercises(chosen, 'bucket'),
      ...buildGroupExercises(chosen, 'match'),
    ]
    questions.push(...(examMode ? group : shuffle(group).slice(0, 2)))
  }

  const body = shuffle(questions)

  // Незнакомые термины показываем стопкой карточек перед вопросами.
  if (!examMode) {
    // Готовые вопросы курса в стопку не идут: у них нет пары термин-определение.
    const fresh = chosen.filter((a) => a.kind !== 'quiz' && (ctx.progress[a.id]?.seen ?? 0) === 0).slice(0, 6)
    const stack = buildStack(fresh)
    if (stack) return [stack, ...body]
  }
  return body
}

/** Атомы, в которых чаще всего ошибались — для вкладки «Слабые места». */
export function weakAtoms(ctx: Ctx, limit = 30): { atom: Atom; p: AtomProgress }[] {
  return ctx.atoms
    .map((a) => ({ atom: a, p: ctx.progress[a.id] }))
    .filter((x): x is { atom: Atom; p: AtomProgress } => !!x.p && (x.p.wrong > 0 || x.p.m < 3) && x.p.seen > 0)
    .sort((a, b) => {
      const aRate = a.p.wrong / Math.max(1, a.p.seen)
      const bRate = b.p.wrong / Math.max(1, b.p.seen)
      if (bRate !== aRate) return bRate - aRate
      return a.p.m - b.p.m
    })
    .slice(0, limit)
}
