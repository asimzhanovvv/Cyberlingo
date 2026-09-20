import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, BookOpen, Check, ChevronDown, Flag, GraduationCap, Layers,
  Loader2, Lock, Play, Search, Target,
} from 'lucide-react'
import { ensureIsland, getIsland, islandMetaById, useContentVersion } from '@/content'
import {
  checkpointOf, FINAL_KEY, loadBank, moduleKey, questionsFor, rangeOf, type BankQ,
} from '@/content/bank'
import { useProgress } from '@/store/progress'
import { useBank } from '@/store/bank'
import { useIslandStats, useUnlocked, RING_COLORS, PASS_SCORE } from '@/lib/progressSelectors'
import { isDue } from '@/engine/srs'
import { Card, Chip } from '@/components/ui/Card'
import { Bar, Ring } from '@/components/ui/Ring'
import { Button } from '@/components/ui/Button'
import { Md } from '@/components/ui/Md'
import { cn, plural } from '@/lib/utils'

type Tab = 'read' | 'terms' | 'exam'
type TermsTab = 'drill' | 'cards'

/** Одно из трёх колец в раскрывающемся разборе процента. */
function RingStat({ label, value, color, sub }: { label: string; value: number; color: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface-2 p-3">
      <Ring value={value} size={62} stroke={6} color={color}>
        <span className="font-display text-xs font-black tabular-nums">{Math.round(value * 100)}%</span>
      </Ring>
      <span className="font-display text-xs font-extrabold uppercase tracking-wide" style={{ color }}>{label}</span>
      <span className="text-center text-[11px] leading-tight text-muted">{sub}</span>
    </div>
  )
}

/** Карточка экзамена из банка вопросов. */
function ExamCard({
  title, hint, count, best, onStart, icon, variant = 'violet',
}: {
  title: string
  hint: string
  count: number
  best?: number
  onStart: () => void
  icon: ReactNode
  variant?: 'violet' | 'accent' | 'surface'
}) {
  return (
    <Card className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-violet">{icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[15px] font-extrabold leading-tight text-text">{title}</h3>
          <p className="text-xs text-muted">{hint}</p>
        </div>
        {best !== undefined && (
          <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-bold',
            best >= PASS_SCORE ? 'bg-success/15 text-success' : 'bg-accent/15 text-accent')}>
            {best}%
          </span>
        )}
      </div>
      <Button full variant={variant} disabled={!count} onClick={onStart}>
        {count ? `Сдавать · ${count} ${plural(count, 'вопрос', 'вопроса', 'вопросов')}` : 'Вопросов нет'}
      </Button>
    </Card>
  )
}

export default function IslandPage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  useContentVersion()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('read')
  const [termsTab, setTermsTab] = useState<TermsTab>('drill')
  const [q, setQ] = useState('')
  const [howOpen, setHowOpen] = useState(false)
  const [bank, setBank] = useState<BankQ[] | null>(null)

  const lessonsRead = useProgress((s) => s.lessonsRead)
  const atomProgress = useProgress((s) => s.atoms)
  const setSettings = useProgress((s) => s.setSettings)
  const runs = useBank((s) => s.runs)
  const unlocked = useUnlocked()

  const meta = islandMetaById.get(id)
  const island = getIsland(id)
  const stats = useIslandStats(meta)

  useEffect(() => {
    setLoading(true)
    void ensureIsland(id).finally(() => setLoading(false))
  }, [id])

  // банк нужен только на вкладке экзамена, поэтому грузим его лениво
  useEffect(() => {
    if (tab === 'exam' && !bank) void loadBank().then(setBank)
  }, [tab, bank])

  const due = useMemo(
    () => (meta?.atomIds ?? []).filter((a) => isDue(atomProgress[a])).length,
    [meta, atomProgress],
  )

  const terms = useMemo(() => (island?.atoms ?? []).filter((a) => a.kind !== 'quiz'), [island])
  const filtered = useMemo(() => {
    if (!q.trim()) return terms
    const n = q.toLowerCase()
    return terms.filter((a) => (a.term + ' ' + a.definition + ' ' + (a.ru ?? '')).toLowerCase().includes(n))
  }, [terms, q])

  if (!meta) return <p className="text-muted">Раздел не найден.</p>

  if (!unlocked.has(id)) {
    return (
      <div className="space-y-4">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
          <ArrowLeft size={16} aria-hidden /> Карта
        </Link>
        <Card className="space-y-4 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-surface-2 text-muted"><Lock size={26} aria-hidden /></span>
          <div>
            <h1 className="font-display text-xl font-extrabold">{meta.id} {meta.title}</h1>
            <p className="mt-1 text-sm text-muted">Сначала освой предыдущий раздел хотя бы наполовину или сдай его экзамен.</p>
          </div>
          <Button variant="surface" onClick={() => setSettings({ unlockAll: true })}>Открыть все острова</Button>
        </Card>
      </div>
    )
  }

  const r = stats.rings
  const hasTerms = meta.termIds.length > 0
  const cp = checkpointOf(meta.moduleId)
  const mKey = moduleKey(meta.moduleId)
  const countFor = (key: string) => (bank ? questionsFor(bank, [key]).length : 0)

  const tabs = [
    { id: 'read' as const, label: 'Теория', icon: BookOpen },
    { id: 'terms' as const, label: 'Термины', icon: Target },
    { id: 'exam' as const, label: 'Экзамен', icon: GraduationCap },
  ]

  return (
    <div className="space-y-5">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft size={16} aria-hidden /> Карта
      </Link>

      <Card className="flex items-start gap-4">
        <Ring value={r.total} size={72} stroke={7}>
          <span className="font-display text-sm font-black tabular-nums">{Math.round(r.total * 100)}%</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Раздел {meta.id}</p>
          <h1 className="font-display text-xl font-black leading-tight">{meta.title}</h1>
          {island?.objective && <p className="mt-2 text-xs leading-relaxed text-muted"><Md text={island.objective} /></p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip>{meta.lessons} {plural(meta.lessons, 'урок', 'урока', 'уроков')}</Chip>
            {hasTerms && <Chip>{meta.termIds.length} {plural(meta.termIds.length, 'термин', 'термина', 'терминов')}</Chip>}
            {due > 0 && <Chip className="border-accent/50 text-accent">{due} к повторению</Chip>}
          </div>
        </div>
      </Card>

      <Card className="p-0">
        <button onClick={() => setHowOpen((v) => !v)} aria-expanded={howOpen}
          className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left">
          <span className="font-display text-[15px] font-bold text-text">Из чего складывается процент</span>
          <ChevronDown size={17} className={cn('shrink-0 text-muted transition-transform', howOpen && 'rotate-180')} aria-hidden />
        </button>
        {howOpen && (
          <div className="space-y-3 border-t border-line-soft px-5 py-4">
            <div className="grid grid-cols-3 gap-2">
              <RingStat label="Теория" value={r.theory} color={RING_COLORS.theory}
                sub={`${stats.readCount} / ${stats.readTotal} ${plural(stats.readTotal, 'урок', 'урока', 'уроков')}`} />
              <RingStat label="Термины" value={r.terms} color={RING_COLORS.terms}
                sub={hasTerms ? `${meta.termIds.length} ${plural(meta.termIds.length, 'термин', 'термина', 'терминов')}` : 'нет терминов'} />
              <RingStat label="Экзамен" value={r.exam} color={RING_COLORS.exam}
                sub={stats.bestExam !== undefined ? `лучший ${stats.bestExam}%` : 'ещё не сдавал'} />
            </div>
            <p className="text-sm leading-relaxed text-muted">
              Общий процент это <b>среднее трёх колец</b>. Теория растёт от прочитанных уроков.
              Термины это средний уровень владения определениями раздела. Экзамен складывается из вопросов
              курса внутри раздела и лучшего результата экзамена модуля.
            </p>
          </div>
        )}
      </Card>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              'press-3d-sm flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 font-display text-sm font-extrabold uppercase tracking-wide transition-colors',
              tab === t.id ? 'border-primary bg-primary/15 text-primary [--press-edge:var(--primary-deep)]' : 'border-line bg-surface-2 text-muted',
            )}>
            <t.icon size={16} aria-hidden /> {t.label}
          </button>
        ))}
      </div>

      {loading && !island ? (
        <div className="flex min-h-40 items-center justify-center gap-2 text-muted">
          <Loader2 size={18} className="animate-spin" aria-hidden /> Загружаю модуль
        </div>
      ) : !island ? (
        <p className="text-muted">Содержимое этого раздела ещё не загружено.</p>
      ) : (
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-3">
          {tab === 'read' && (
            <>
              <p className="text-sm text-muted">Материал раздела целиком: определения, аккордеоны, таблицы и задания курса.</p>
              <div className="space-y-2">
                {island.lessons.map((l) => {
                  const read = !!lessonsRead[l.id]
                  const n = island.atoms.filter((a) => a.lesson === l.id).length
                  return (
                    <div key={l.id} className="flex items-stretch gap-2">
                      <Link to={`/lesson/${l.id}`} className="press-3d-sm flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 [--press-edge:var(--border)]">
                        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl font-display text-xs font-black',
                          read ? 'bg-success text-on-primary' : 'bg-surface-3 text-muted')}>
                          {read ? <Check size={16} aria-hidden /> : l.id.split('.').pop()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-[15px] font-bold leading-tight text-text line-clamp-2">{l.title}</span>
                          <span className="block truncate text-xs text-muted">
                            {l.id}{n > 0 && ` · ${n} ${plural(n, 'вопрос', 'вопроса', 'вопросов')}`}
                          </span>
                        </span>
                      </Link>
                      {n > 0 && (
                        <button onClick={() => nav(`/session/learn/${l.id}`)} aria-label={`Тренировать ${l.id}`}
                          className="press-3d-sm grid w-14 shrink-0 place-items-center rounded-2xl border border-line bg-surface-2 text-primary [--press-edge:var(--border)]">
                          <Target size={18} aria-hidden />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {tab === 'terms' && (
            <>
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-surface-2 p-1.5">
                {([
                  { id: 'drill' as const, label: 'Тренировка', icon: Target },
                  { id: 'cards' as const, label: 'Карточки', icon: Layers },
                ]).map((s) => (
                  <button key={s.id} onClick={() => setTermsTab(s.id)}
                    className={cn('flex items-center justify-center gap-2 rounded-xl py-2.5 font-display text-sm font-extrabold transition-colors',
                      termsTab === s.id ? 'bg-violet text-on-primary' : 'text-muted')}>
                    <s.icon size={15} aria-hidden /> {s.label}
                  </button>
                ))}
              </div>

              {termsTab === 'drill' ? (
                <Card className="space-y-4">
                  <div>
                    <h2 className="font-display text-lg font-extrabold">Тренировка терминов</h2>
                    <p className="mt-1 text-sm text-muted">
                      {hasTerms
                        ? 'Незнакомые термины идут стопкой карточек, дальше вопросы разных форматов по уровню владения: выбрать термин, выбрать определение, дополнить предложение, ввести с клавиатуры, сопоставить пары, разложить по категориям.'
                        : 'В этом разделе термины ещё не размечены, поэтому тренировка идёт по вопросам курса.'}
                    </p>
                    <p className="mt-2 rounded-xl border border-line bg-surface-2 p-3 text-xs leading-relaxed text-muted">
                      Ошибся, и вопрос откладывается. В конце будет <b>один</b> второй заход по всем промахам.
                      Процент считается только по ответам <b>с первого раза</b>.
                    </p>
                  </div>
                  <Bar value={r.terms} color={RING_COLORS.terms} />
                  <div className="flex flex-wrap gap-1.5 text-xs text-muted">
                    <Chip>{due} к повторению</Chip>
                    <Chip>{stats.weakTerms.length} слабых</Chip>
                  </div>
                  <Button full size="lg" variant="violet" icon={<Play size={18} />} disabled={!meta.atomIds.length}
                    onClick={() => nav(`/session/learn/${id}`)}>
                    {meta.atomIds.length ? 'Начать' : 'Вопросов нет'}
                  </Button>
                  {stats.weak.length > 0 && (
                    <Button full variant="surface" onClick={() => nav(`/session/review/${id}`)}>Только слабые места</Button>
                  )}
                </Card>
              ) : (
                <>
                  <Card className="space-y-3">
                    <h2 className="font-display text-lg font-extrabold">Флеш-карточки</h2>
                    <p className="text-sm text-muted">
                      Тупой прогон по кругу: термин, переворот, определение. На уровень не влияет,
                      отмеченные «не знал» попадают в слабые места.
                    </p>
                    <Button full size="lg" variant="violet" icon={<Layers size={18} />} disabled={!terms.length}
                      onClick={() => nav(`/session/flash/${id}`)}>
                      {terms.length
                        ? `Прогнать ${terms.length} ${plural(terms.length, 'карточку', 'карточки', 'карточек')}`
                        : 'Карточек нет'}
                    </Button>
                  </Card>
                  <label className="relative block">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по терминам раздела"
                      className="w-full rounded-2xl border border-line bg-surface-2 py-3 pl-10 pr-4 text-sm text-text outline-none focus:border-primary" />
                  </label>
                  <div className="space-y-2">
                    {filtered.map((a) => (
                      <div key={a.id} className="rounded-2xl border border-line bg-surface p-3.5">
                        <p className="font-display text-[15px] font-bold text-text">{a.term}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-muted">{a.definition}</p>
                        {a.ru && <p className="mt-1 text-xs text-primary/80">{a.ru}</p>}
                        <Link to={`/lesson/${a.lesson}`} className="mt-1.5 inline-block text-xs font-semibold text-primary hover:underline">Теория {a.lesson}</Link>
                      </div>
                    ))}
                    {filtered.length === 0 && <p className="py-6 text-center text-sm text-muted">Ничего не найдено.</p>}
                  </div>
                </>
              )}
            </>
          )}

          {tab === 'exam' && (
            <>
              <p className="text-sm text-muted">
                Настоящие экзамены курса из банка вопросов. Идут в том же порядке, что на netacad:
                экзамен модуля, затем checkpoint по группе модулей, в самом конце final exam.
              </p>

              {!bank ? (
                <div className="flex min-h-32 items-center justify-center gap-2 text-muted">
                  <Loader2 size={18} className="animate-spin" aria-hidden /> Загружаю банк вопросов
                </div>
              ) : (
                <>
                  <ExamCard
                    title={`Module ${meta.moduleId} Exam`}
                    hint="вопросы этого модуля"
                    count={countFor(mKey)}
                    best={runs[mKey]?.best}
                    icon={<GraduationCap size={20} aria-hidden />}
                    onStart={() => nav(`/exam/run/${mKey}`)}
                  />

                  {cp && (
                    <ExamCard
                      title={cp.label}
                      hint={rangeOf(cp)}
                      count={countFor(cp.key)}
                      best={runs[cp.key]?.best}
                      variant="accent"
                      icon={<Flag size={20} aria-hidden />}
                      onStart={() => nav(`/exam/run/${cp.key}`)}
                    />
                  )}

                  <ExamCard
                    title="Final Exam"
                    hint="вопросы по всему курсу"
                    count={countFor(FINAL_KEY)}
                    best={runs[FINAL_KEY]?.best}
                    variant="surface"
                    icon={<Flag size={20} aria-hidden />}
                    onStart={() => nav(`/exam/run/${FINAL_KEY}`)}
                  />

                  {meta.quizIds.length > 0 && (
                    <Card className="space-y-3">
                      <div>
                        <h3 className="font-display text-[15px] font-extrabold">Вопросы курса из раздела</h3>
                        <p className="text-xs text-muted">
                          {meta.quizIds.length} {plural(meta.quizIds.length, 'вопрос', 'вопроса', 'вопросов')} из уроков
                          и квиза этого раздела, без второго захода. Проходной балл {PASS_SCORE}%.
                        </p>
                      </div>
                      {stats.exam && (
                        <div className="flex flex-wrap gap-1.5">
                          <Chip className={stats.exam.passed ? 'border-success/50 text-success' : ''}>Лучший: {stats.exam.best}%</Chip>
                          <Chip>{stats.exam.attempts} {plural(stats.exam.attempts, 'попытка', 'попытки', 'попыток')}</Chip>
                        </div>
                      )}
                      <Button full variant="surface" onClick={() => nav(`/session/exam/${id}`)}>Прогнать вопросы раздела</Button>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </motion.div>
      )}
    </div>
  )
}
