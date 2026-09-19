import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Loader2, PartyPopper, RotateCcw, X } from 'lucide-react'
import type { Exercise } from '@/types'
import { answerText, loadBank, questionsFor, toExercise, type BankQ } from '@/content/bank'
import { useBank, wrongIds } from '@/store/bank'
import { shuffle } from '@/engine/generate'
import { useProgress } from '@/store/progress'
import { playFinish } from '@/lib/sound'
import { ExerciseView } from '@/components/exercises/ExerciseView'
import { Button } from '@/components/ui/Button'
import { Card, Chip } from '@/components/ui/Card'
import { Bar } from '@/components/ui/Ring'
import { Md } from '@/components/ui/Md'
import { cn, plural } from '@/lib/utils'

const PASS = 80

/** Длинные формулировки в разборе показываем тремя строками с кнопкой развернуть. */
function Foldable({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const long = text.length > 170
  return (
    <div>
      <p className={cn('text-sm leading-relaxed text-text', long && !open && 'line-clamp-3')}>
        <Md text={text} />
      </p>
      {long && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
        >
          {open ? 'Свернуть' : 'Развернуть вопрос'}
          <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
      )}
    </div>
  )
}

export default function BankSession() {
  const { scope = '' } = useParams()
  const [params] = useSearchParams()
  const limit = Number(params.get('n')) || 0
  const nav = useNavigate()

  const answer = useBank((s) => s.answer)
  const recordRun = useBank((s) => s.recordRun)
  const seen = useBank((s) => s.seen)
  const touchStreak = useProgress((s) => s.touchStreak)
  const addXp = useProgress((s) => s.addXp)

  const [queue, setQueue] = useState<{ ex: Exercise; q: BankQ }[] | null>(null)
  const [pos, setPos] = useState(0)
  const [done, setDone] = useState(false)
  const [right, setRight] = useState(0)
  const [missed, setMissed] = useState<BankQ[]>([])

  const keys = useMemo(() => scope.split('-').filter(Boolean), [scope])

  useEffect(() => {
    let alive = true
    void loadBank().then((bank) => {
      if (!alive) return
      const ids = new Set(wrongIds(useBank.getState().seen))
      let pool = scope === 'wrong' ? bank.filter((q) => ids.has(q.id)) : questionsFor(bank, keys)
      pool = shuffle(pool)
      if (limit && pool.length > limit) pool = pool.slice(0, limit)
      const built = pool
        .map((q) => ({ ex: toExercise(q), q }))
        .filter((x): x is { ex: Exercise; q: BankQ } => !!x.ex)
      setQueue(built)
      setPos(0); setDone(false); setRight(0); setMissed([])
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, limit])

  const title = scope === 'wrong' ? 'Мои ошибки' : keys.join(', ')
  const current = queue?.[pos]

  const handle = (correct: boolean) => {
    if (!current) return
    answer(current.q.id, correct)
    if (correct) { setRight((r) => r + 1); addXp(3) }
    else setMissed((m) => [...m, current.q])

    if (pos + 1 < (queue?.length ?? 0)) setPos((p) => p + 1)
    else {
      const total = queue?.length ?? 1
      const pct = Math.round(((right + (correct ? 1 : 0)) / total) * 100)
      touchStreak()
      playFinish()
      if (scope !== 'wrong') for (const k of keys) recordRun(k, pct)
      setDone(true)
    }
  }

  if (!queue) {
    return (
      <div className="flex min-h-dvh items-center justify-center gap-2 text-muted">
        <Loader2 size={18} className="animate-spin" aria-hidden /> Готовлю вопросы
      </div>
    )
  }

  if (!queue.length) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-4 pt-16 text-center">
        <p className="text-muted">В этой выборке нет вопросов.</p>
        <Button onClick={() => nav('/exam')}>Назад</Button>
      </div>
    )
  }

  if (done) {
    const pct = Math.round((right / queue.length) * 100)
    const passed = pct >= PASS
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 p-4">
        <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
          <Card className="space-y-4 text-center">
            <span className={cn('mx-auto grid h-16 w-16 place-items-center rounded-full', passed ? 'bg-success' : 'bg-accent')}>
              <PartyPopper size={28} className="text-on-primary" aria-hidden />
            </span>
            <div>
              <h1 className="font-display text-2xl font-black">{passed ? 'Сдано' : 'Не сдано'}</h1>
              <p className="mt-1 text-sm text-muted">{title}</p>
            </div>
            <p className="font-display text-5xl font-black tabular-nums" style={{ color: passed ? 'var(--success)' : 'var(--accent)' }}>{pct}%</p>
            <Bar value={pct / 100} color={passed ? 'var(--success)' : 'var(--accent)'} />
            <div className="flex justify-center gap-2">
              <Chip className="border-success/50 text-success">Верно: {right}</Chip>
              <Chip className="border-danger/50 text-danger">Ошибок: {queue.length - right}</Chip>
            </div>
            <p className="text-xs text-muted">Проходной {PASS}%. На процент островов этот прогон не влияет.</p>
          </Card>
        </motion.div>

        {missed.length > 0 && (
          <Card className="space-y-2">
            <h2 className="font-display text-base font-extrabold">Разбор ошибок</h2>
            {missed.map((q) => (
              <div key={q.id} className="rounded-xl border border-line bg-surface-2 p-3">
                <Foldable text={q.q} />
                <p className="mt-1.5 whitespace-pre-line text-sm font-semibold text-success">{answerText(q)}</p>
                <p className="mt-1 text-xs text-muted">вопрос №{q.n}{q.modules.length ? ` · ${q.modules.join(', ')}` : ''}</p>
              </div>
            ))}
          </Card>
        )}

        <div className="grid gap-2">
          {missed.length > 0 && (
            <Button full size="lg" variant="danger" icon={<RotateCcw size={18} />} onClick={() => nav('/exam/run/wrong')}>
              Прогнать ошибки
            </Button>
          )}
          <Button full size="lg" onClick={() => nav(0)}>Пройти заново</Button>
          <Button full size="lg" variant="surface" onClick={() => nav('/exam')}>Выйти</Button>
        </div>
      </div>
    )
  }

  const stat = current ? seen[current.q.id] : undefined
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col p-4">
      <header className="mb-4 flex items-center gap-3 safe-t">
        <button onClick={() => nav('/exam')} aria-label="Выйти" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-muted">
          <X size={18} aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <Bar value={pos / queue.length} color="var(--violet)" />
          <p className="mt-1 truncate text-xs text-muted">
            {title} · {pos + 1} из {queue.length} · верно {right}
            {stat && stat.wrong > 0 && ` · раньше ошибался ${stat.wrong} ${plural(stat.wrong, 'раз', 'раза', 'раз')}`}
          </p>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={current?.ex.key}
          initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex min-h-0 flex-1 flex-col"
        >
          {current && <ExerciseView ex={current.ex} onDone={handle} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
