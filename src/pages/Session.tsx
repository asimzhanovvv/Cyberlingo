import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, PartyPopper, RotateCcw, Undo2, X } from 'lucide-react'
import type { Exercise, Grade } from '@/types'
import {
  allAtoms, atomsForIsland, atomsForModules, ensureModules, getAtom, getIsland, getLesson,
  islandMetaById, modulesOfAtoms,
} from '@/content'
import { buildSession, type SessionMode } from '@/engine/session'
import { useProgress } from '@/store/progress'
import { PASS_SCORE } from '@/lib/progressSelectors'
import { ExerciseView } from '@/components/exercises/ExerciseView'
import { Button } from '@/components/ui/Button'
import { Card, Chip } from '@/components/ui/Card'
import { Bar } from '@/components/ui/Ring'
import { cn, plural } from '@/lib/utils'
import { playFinish } from '@/lib/sound'

/** Какие модули надо подгрузить, чтобы собрать сессию. */
function modulesForScope(scope: string, touched: string[]): number[] {
  if (scope === 'all') return modulesOfAtoms(touched)
  if (scope.startsWith('m')) return scope.slice(1).split('-').map(Number).filter(Boolean)
  return [Number(scope.split('.')[0])].filter((n) => !Number.isNaN(n))
}

function resolveAtoms(scope: string) {
  if (scope === 'all') return allAtoms()
  if (scope.startsWith('m')) return atomsForModules(scope.slice(1).split('-').map(Number).filter(Boolean))
  if (scope.split('.').length >= 3) {
    const island = getLesson(scope)?.island
    return island ? island.atoms.filter((a) => a.lesson === scope) : []
  }
  return atomsForIsland(scope)
}

type Phase = 'main' | 'bridge' | 'retry' | 'done'

export default function SessionPage() {
  const { mode = 'learn', scope = '' } = useParams<{ mode: SessionMode; scope: string }>()
  const [params] = useSearchParams()
  const limit = Number(params.get('n')) || undefined
  const nav = useNavigate()

  const progress = useProgress((s) => s.atoms)
  const answer = useProgress((s) => s.answer)
  const recordExam = useProgress((s) => s.recordExam)
  const touchStreak = useProgress((s) => s.touchStreak)

  const [queue, setQueue] = useState<Exercise[]>([])
  const [retry, setRetry] = useState<Exercise[]>([])
  const [phase, setPhase] = useState<Phase>('main')
  const [pos, setPos] = useState(0)
  const [score, setScore] = useState({ first: 0, second: 0, failed: 0, total: 0 })
  const [missed, setMissed] = useState<string[]>([])

  const islandId = scope.includes('.') ? scope.split('.').slice(0, 2).join('.') : ''
  const islandMeta = islandMetaById.get(islandId)
  const island = islandId ? getIsland(islandId) : undefined
  const lesson = scope.split('.').length >= 3 ? getLesson(scope)?.lesson : undefined
  const examMode = mode === 'exam'

  const title = useMemo(() => {
    if (examMode) return islandMeta ? `Экзамен ${islandMeta.id}` : 'Прогон терминов'
    if (mode === 'flash') return 'Карточки'
    if (mode === 'review') return 'Слабые места'
    if (lesson) return `Тренировка ${lesson.id}`
    return islandMeta ? `Раздел ${islandMeta.id}` : 'Тренировка'
  }, [mode, islandMeta, lesson, examMode])

  useEffect(() => {
    let alive = true
    const touched = Object.keys(progress)
    void ensureModules(modulesForScope(scope, touched)).then(() => {
      if (!alive) return
      const atoms = resolveAtoms(scope)
      const size = limit ?? (mode === 'learn' ? 14 : mode === 'review' ? 20 : undefined)
      const built = buildSession({ atoms, progress }, { mode: mode as SessionMode, size, groups: mode !== 'flash' })
      setQueue(built)
      setRetry([])
      setPhase('main')
      setPos(0)
      setScore({ first: 0, second: 0, failed: 0, total: built.filter((e) => e.format !== 'stack').length })
      setMissed([])
    })
    return () => { alive = false }
    // сессия строится один раз на вход, иначе перестраивалась бы после каждого ответа
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, scope, limit])

  const active = phase === 'retry' ? retry : queue
  const current = active[pos]

  const grade = (ids: string[], g: Grade) => { for (const id of ids) answer(id, g) }

  const advance = (list: Exercise[], nextRetry: Exercise[]) => {
    if (pos + 1 < list.length) { setPos((p) => p + 1); return }
    if (phase === 'main' && !examMode && nextRetry.length) { setPhase('bridge'); return }
    finish()
  }

  const finish = () => {
    touchStreak()
    playFinish()
    if (examMode && islandMeta) {
      const pct = score.total ? Math.round((score.first / score.total) * 100) : 0
      recordExam(islandMeta.id, pct, PASS_SCORE)
    }
    setPhase('done')
  }

  const handle = (correct: boolean, detail?: { unknown?: string[] }) => {
    if (!current) return

    // Стопка карточек: прогресс не трогаем, но «не знал» уходит во второй заход.
    if (current.format === 'stack') {
      const unknown = detail?.unknown ?? []
      if (unknown.length) setMissed((m) => Array.from(new Set([...m, ...unknown])))
      if (unknown.length && phase === 'main' && !examMode && current.format === 'stack') {
        const again = {
          ...current,
          key: current.key + '-r',
          prompt: 'Повтори карточки',
          hint: 'Эти термины ты отметил как незнакомые',
          atomIds: unknown,
          cards: current.cards.filter((c) => unknown.includes(c.atomId)),
        }
        const next = [...retry, again]
        setRetry(next)
        advance(queue, next)
        return
      }
      advance(active, retry)
      return
    }

    // Режим «Карточки»: только самопроверка, на уровень терминов не влияет.
    if (mode === 'flash') {
      if (!correct) setMissed((m) => Array.from(new Set([...m, ...current.atomIds])))
      advance(active, retry)
      return
    }

    if (phase === 'main') {
      if (correct) {
        grade(current.atomIds, 'first')
        setScore((s) => ({ ...s, first: s.first + 1 }))
        advance(queue, retry)
      } else {
        setMissed((m) => Array.from(new Set([...m, ...current.atomIds])))
        if (examMode) {
          grade(current.atomIds, 'failed')
          setScore((s) => ({ ...s, failed: s.failed + 1 }))
          advance(queue, retry)
        } else {
          const next = [...retry, { ...current, key: current.key + '-r' }]
          setRetry(next)
          advance(queue, next)
        }
      }
    } else {
      grade(current.atomIds, correct ? 'retry' : 'failed')
      setScore((s) => correct ? { ...s, second: s.second + 1 } : { ...s, failed: s.failed + 1 })
      advance(retry, retry)
    }
  }

  if (!queue.length && phase !== 'done') {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-4 pt-16 text-center">
        <p className="text-muted">Нечего тренировать: в этой выборке нет терминов.</p>
        <Button onClick={() => nav(-1)}>Назад</Button>
      </div>
    )
  }

  if (phase === 'bridge') {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 p-4">
        <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
          <Card className="space-y-4 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent">
              <Undo2 size={28} className="text-on-accent" aria-hidden />
            </span>
            <h1 className="font-display text-2xl font-black">Второй заход</h1>
            <p className="text-sm leading-relaxed text-muted">
              Сейчас вернутся {retry.length} {plural(retry.length, 'вопрос', 'вопроса', 'вопросов')}, на которые ты ответил неверно.
              Даётся <b>одна</b> попытка. Ответишь верно — термин зачтётся наполовину, снова ошибёшься — он уйдёт в слабые места.
            </p>
            <Button full size="lg" variant="accent" onClick={() => { setPhase('retry'); setPos(0) }}>Поехали</Button>
          </Card>
        </motion.div>
      </div>
    )
  }

  if (phase === 'done') {
    const pct = score.total ? Math.round((score.first / score.total) * 100) : 0
    const withRetry = score.total ? Math.round(((score.first + score.second * 0.5) / score.total) * 100) : 0
    const passed = pct >= PASS_SCORE
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 p-4">
        <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
          <Card className="space-y-4 text-center">
            <span className={cn('mx-auto grid h-16 w-16 place-items-center rounded-full', passed ? 'bg-success' : 'bg-accent')}>
              <PartyPopper size={28} className="text-on-primary" aria-hidden />
            </span>
            <div>
              <h1 className="font-display text-2xl font-black">
                {mode === 'flash' ? 'Стопка пройдена' : examMode ? (passed ? 'Экзамен сдан' : 'Не сдан') : 'Урок пройден'}
              </h1>
              <p className="mt-1 text-sm text-muted">{title}</p>
            </div>
            {mode === 'flash' ? (
              <>
                <p className="font-display text-5xl font-black tabular-nums text-primary">{queue.length}</p>
                <p className="text-xs text-muted">карточек просмотрено. Уровень терминов карточки не меняют</p>
                {missed.length > 0 && <Chip className="border-danger/50 text-danger">Отмечено «не знал»: {missed.length}</Chip>}
              </>
            ) : (
              <>
                <div>
                  <p className="font-display text-5xl font-black tabular-nums" style={{ color: passed ? 'var(--success)' : 'var(--accent)' }}>{pct}%</p>
                  <p className="text-xs text-muted">знание темы, считается только с первого раза</p>
                </div>
                <Bar value={pct / 100} color={passed ? 'var(--success)' : 'var(--accent)'} />
                <div className="flex flex-wrap justify-center gap-2">
                  <Chip className="border-success/50 text-success">С первого раза: {score.first}</Chip>
                  {score.second > 0 && <Chip className="border-accent/50 text-accent">Со второго: {score.second}</Chip>}
                  {score.failed > 0 && <Chip className="border-danger/50 text-danger">Не смог: {score.failed}</Chip>}
                </div>
                {score.second > 0 && <p className="text-xs text-muted">С учётом второго захода: {withRetry}%</p>}
              </>
            )}
          </Card>
        </motion.div>

        {missed.length > 0 && (
          <Card className="space-y-2">
            <h2 className="font-display text-base font-extrabold">Эти термины вы знаете плохо</h2>
            {missed.slice(0, 12).map((id) => {
              const a = getAtom(id)
              if (!a) return null
              return (
                <Link key={id} to={`/lesson/${a.lesson}`} className="block rounded-xl border border-line bg-surface-2 p-3">
                  <p className="font-display text-sm font-bold text-text">{a.term}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{a.definition}</p>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    <BookOpen size={12} aria-hidden /> Теория {a.lesson}
                  </span>
                </Link>
              )
            })}
            {missed.length > 12 && <p className="text-xs text-muted">и ещё {missed.length - 12}</p>}
          </Card>
        )}

        <div className="grid gap-2">
          <Button full size="lg" icon={<RotateCcw size={18} />} onClick={() => nav(0)}>Пройти заново</Button>
          <Button full size="lg" variant="surface" onClick={() => nav(islandMeta ? `/island/${islandMeta.id}` : '/')}>Выйти</Button>
        </div>
      </div>
    )
  }

  const answered = score.first + score.second + score.failed
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col p-4">
      <header className="mb-4 flex items-center gap-3 safe-t">
        <button onClick={() => nav(-1)} aria-label="Выйти" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-muted">
          <X size={18} aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <Bar value={active.length ? pos / active.length : 0} color={phase === 'retry' ? 'var(--accent)' : 'var(--primary)'} />
          <p className="mt-1 truncate text-xs text-muted">
            {phase === 'retry' ? 'Второй заход' : title} · {pos + 1} из {active.length}
            {answered > 0 && ` · ${score.first} с первого раза`}
          </p>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={current?.key}
          initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex min-h-0 flex-1 flex-col"
        >
          {current && <ExerciseView ex={current} onDone={handle} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
