import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, GraduationCap, Loader2, RotateCcw, Sparkles, Target, TrendingUp } from 'lucide-react'
import {
  allAtoms, allAtomIds, ensureModules, islandMetaById, moduleMeta, modulesOfAtoms, useContentVersion,
} from '@/content'
import { loadBank, type BankQ } from '@/content/bank'
import { weakAtoms } from '@/engine/session'
import { useProgress } from '@/store/progress'
import { useBank } from '@/store/bank'
import { RING_COLORS } from '@/lib/progressSelectors'
import { Card, Chip } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Bar } from '@/components/ui/Ring'
import { cn, plural } from '@/lib/utils'

type Source = 'terms' | 'exam'
type Scope = 'all' | number

const moduleOfLesson = (lessonId: string) => Number(lessonId.split('.')[0])

export default function Review() {
  const progress = useProgress((s) => s.atoms)
  const seen = useBank((s) => s.seen)
  const nav = useNavigate()
  useContentVersion()

  const [loading, setLoading] = useState(true)
  const [bank, setBank] = useState<BankQ[] | null>(null)
  const [source, setSource] = useState<Source>('terms')
  const [scope, setScope] = useState<Scope>('all')

  const touched = Object.keys(progress)
  const seenCount = touched.filter((id) => progress[id]?.seen).length

  useEffect(() => {
    setLoading(true)
    void ensureModules(modulesOfAtoms(touched)).finally(() => setLoading(false))
    // список изучённых атомов меняется редко, поэтому считаем по его длине
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touched.length])

  useEffect(() => { void loadBank().then(setBank) }, [])

  /* ------------------------------ данные ------------------------------ */

  const allWeak = useMemo(() => weakAtoms({ atoms: allAtoms(), progress }, 400), [progress])

  const weakTerms = useMemo(() => allWeak.filter((w) => w.atom.kind !== 'quiz'), [allWeak])
  const weakQuiz = useMemo(() => allWeak.filter((w) => w.atom.kind === 'quiz'), [allWeak])

  /** Вопросы банка, на которые последний ответ был неверным. */
  const weakBank = useMemo(() => {
    if (!bank) return [] as BankQ[]
    return bank.filter((q) => seen[q.id]?.last === 'wrong')
  }, [bank, seen])

  const pool = source === 'terms' ? weakTerms : weakQuiz

  /** Модули, в которых вообще есть слабые места по выбранному источнику. */
  const modulesWithWeak = useMemo(() => {
    const set = new Set<number>()
    for (const w of pool) set.add(moduleOfLesson(w.atom.lesson))
    if (source === 'exam') for (const q of weakBank) for (const m of q.modules) {
      if (m.startsWith('M')) set.add(Number(m.slice(1)))
    }
    return Array.from(set).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b)
  }, [pool, weakBank, source])

  const shown = useMemo(
    () => (scope === 'all' ? pool : pool.filter((w) => moduleOfLesson(w.atom.lesson) === scope)),
    [pool, scope],
  )

  const shownBank = useMemo(() => {
    if (source !== 'exam') return [] as BankQ[]
    if (scope === 'all') return weakBank
    return weakBank.filter((q) => q.modules.includes(`M${scope}`))
  }, [weakBank, scope, source])

  /* ------------------------------ действия ---------------------------- */

  const sessionScope = scope === 'all' ? 'all' : `m${scope}`
  const kind = source === 'terms' ? 'term' : 'quiz'
  const bankScope = scope === 'all' ? 'wrong' : `wrong:M${scope}`
  const moduleTitle = (n: number) => moduleMeta.find((m) => m.id === n)?.title ?? ''

  const sources: { id: Source; label: string; icon: typeof Target; color: string }[] = [
    { id: 'terms', label: 'Термины', icon: Target, color: RING_COLORS.terms },
    { id: 'exam', label: 'Экзамены', icon: GraduationCap, color: RING_COLORS.exam },
  ]

  if (seenCount === 0 && weakBank.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-black leading-tight">Слабые места</h1>
          <p className="mt-1 text-sm text-muted">Здесь копится всё, в чём ты ошибался или что ещё не закрепилось.</p>
        </div>
        <Card className="space-y-3 text-center">
          <Sparkles size={24} className="mx-auto text-muted" aria-hidden />
          <p className="text-sm text-muted">Пока нет данных. Пройди первый раздел, и здесь появится список того, что стоит подтянуть.</p>
          <Button onClick={() => nav('/')}>На карту</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-black leading-tight">Слабые места</h1>
        <p className="mt-1 text-sm text-muted">
          Отдельно по терминам и отдельно по экзаменам, с разбивкой по модулям.
          Выбери, что именно подтягиваешь, и прогони только это.
        </p>
      </div>

      {/* источник */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-surface-2 p-1.5">
        {sources.map((s) => {
          const on = source === s.id
          const n = s.id === 'terms' ? weakTerms.length : weakQuiz.length + weakBank.length
          return (
            <button key={s.id} onClick={() => { setSource(s.id); setScope('all') }}
              className={cn('flex items-center justify-center gap-2 rounded-xl py-2.5 font-display text-sm font-extrabold transition-colors',
                on ? 'text-on-primary' : 'text-muted')}
              style={on ? { background: s.color } : undefined}>
              <s.icon size={15} aria-hidden /> {s.label}
              <span className={cn('rounded-full px-1.5 text-xs', on ? 'bg-black/20' : 'bg-surface-3')}>{n}</span>
            </button>
          )
        })}
      </div>

      {/* модуль */}
      {modulesWithWeak.length > 0 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <button onClick={() => setScope('all')}
            className={cn('press-3d-sm shrink-0 rounded-2xl border px-4 py-2 font-display text-sm font-bold',
              scope === 'all' ? 'border-primary bg-primary/15 text-primary' : 'border-line bg-surface-2 text-muted')}>
            Все модули
          </button>
          {modulesWithWeak.map((n) => (
            <button key={n} onClick={() => setScope(n)}
              className={cn('press-3d-sm shrink-0 rounded-2xl border px-4 py-2 font-display text-sm font-bold',
                scope === n ? 'border-primary bg-primary/15 text-primary' : 'border-line bg-surface-2 text-muted')}>
              Модуль {n}
            </button>
          ))}
        </div>
      )}

      {scope !== 'all' && (
        <p className="-mt-2 text-xs text-muted">{moduleTitle(scope)}</p>
      )}

      {loading ? (
        <div className="flex min-h-40 items-center justify-center gap-2 text-muted">
          <Loader2 size={18} className="animate-spin" aria-hidden /> Загружаю разделы
        </div>
      ) : (
        <>
          <Card className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <Chip className="border-danger/50 text-danger">
                {shown.length} {plural(shown.length, 'вопрос', 'вопроса', 'вопросов')}
                {source === 'exam' && shownBank.length > 0 && ` + ${shownBank.length} из банка`}
              </Chip>
              <Chip>изучено {seenCount} из {allAtomIds.length}</Chip>
            </div>
            <Button full size="lg" icon={<Sparkles size={18} />} disabled={!shown.length}
              onClick={() => nav(`/session/review/${sessionScope}?kind=${kind}`)}>
              {shown.length
                ? source === 'terms' ? 'Прогнать слабые термины' : 'Прогнать слабые вопросы курса'
                : 'Здесь всё закреплено'}
            </Button>
            {source === 'exam' && shownBank.length > 0 && (
              <Button full variant="danger" icon={<RotateCcw size={18} />} onClick={() => nav(`/exam/run/${bankScope}`)}>
                Прогнать {shownBank.length} {plural(shownBank.length, 'ошибку', 'ошибки', 'ошибок')} из экзаменов
              </Button>
            )}
          </Card>

          {shown.length === 0 && shownBank.length === 0 ? (
            <Card className="space-y-2 text-center">
              <TrendingUp size={24} className="mx-auto text-success" aria-hidden />
              <p className="text-sm text-muted">Слабых мест здесь нет: всё пройденное закреплено минимум на третий уровень.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {shown.map(({ atom, p }) => {
                const meta = islandMetaById.get(atom.lesson.split('.').slice(0, 2).join('.'))
                return (
                  <Card key={atom.id} className="p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-display text-[15px] font-bold text-text">{atom.term}</p>
                      <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold text-danger">{p.wrong}/{p.seen}</span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted line-clamp-4">{atom.definition}</p>
                    {atom.ru && <p className="mt-1 text-xs text-primary/80 line-clamp-3">{atom.ru}</p>}
                    <Bar value={p.m / 5} className="mt-2 h-2" color={p.m >= 3 ? 'var(--success)' : 'var(--danger)'} />
                    <Link to={`/lesson/${atom.lesson}`} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                      <BookOpen size={13} aria-hidden /> {meta?.title ?? ''} · {atom.lesson}
                    </Link>
                  </Card>
                )
              })}

              {shownBank.slice(0, 40).map((q) => (
                <Card key={q.id} className="border-danger/25 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm leading-relaxed text-text line-clamp-4">{q.q}</p>
                    <span className="shrink-0 rounded-full bg-danger/15 px-2 py-0.5 text-xs font-bold text-danger">банк</span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted">{q.modules.join(', ') || 'без модуля'} · вопрос {q.n}</p>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
