import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen, Check, ChevronDown, GraduationCap, Layers, Loader2, Lock, Play, Search, Target } from 'lucide-react'
import { ensureIsland, getIsland, islandMetaById, useContentVersion } from '@/content'
import { useProgress } from '@/store/progress'
import { useIslandStats, useUnlocked, PASS_SCORE } from '@/lib/progressSelectors'
import { isDue } from '@/engine/srs'
import { MAX_MASTERY } from '@/engine/srs'
import { Card, Chip } from '@/components/ui/Card'
import { Bar, Ring } from '@/components/ui/Ring'
import { Button } from '@/components/ui/Button'
import { Md } from '@/components/ui/Md'
import { cn, plural } from '@/lib/utils'

export default function IslandPage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  useContentVersion()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'read' | 'train' | 'cards' | 'exam'>('read')
  const [q, setQ] = useState('')
  const [howOpen, setHowOpen] = useState(false)

  const lessonsRead = useProgress((s) => s.lessonsRead)
  const atomProgress = useProgress((s) => s.atoms)
  const setSettings = useProgress((s) => s.setSettings)
  const unlocked = useUnlocked()

  const meta = islandMetaById.get(id)
  const island = getIsland(id)
  const stats = useIslandStats(meta)

  useEffect(() => {
    setLoading(true)
    void ensureIsland(id).finally(() => setLoading(false))
  }, [id])

  const due = useMemo(
    () => (meta?.atomIds ?? []).filter((a) => isDue(atomProgress[a])).length,
    [meta, atomProgress],
  )
  const hasTerms = !!island?.atoms.some((a) => a.kind !== 'quiz')
  const filtered = useMemo(() => {
    const list = island?.atoms ?? []
    if (!q.trim()) return list
    const n = q.toLowerCase()
    return list.filter((a) => (a.term + ' ' + a.definition + ' ' + (a.ru ?? '')).toLowerCase().includes(n))
  }, [island, q])

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

  const tabs = [
    { id: 'read' as const, label: 'Теория', icon: BookOpen },
    { id: 'train' as const, label: hasTerms ? 'Тренировка' : 'Вопросы', icon: Target },
    ...(hasTerms ? [{ id: 'cards' as const, label: 'Карточки', icon: Layers }] : []),
    { id: 'exam' as const, label: 'Экзамен', icon: GraduationCap },
  ]

  return (
    <div className="space-y-5">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft size={16} aria-hidden /> Карта
      </Link>

      <Card className="flex items-start gap-4">
        <Ring value={stats.mastery} size={72} stroke={7}>
          <span className="font-display text-sm font-black tabular-nums">{Math.round(stats.mastery * 100)}%</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Раздел {meta.id}</p>
          <h1 className="font-display text-xl font-black leading-tight">{meta.title}</h1>
          {island?.objective && <p className="mt-2 text-xs leading-relaxed text-muted"><Md text={island.objective} /></p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip>{meta.lessons} {plural(meta.lessons, 'урок', 'урока', 'уроков')}</Chip>
            <Chip>{meta.atomIds.length} {plural(meta.atomIds.length, 'вопрос', 'вопроса', 'вопросов')}</Chip>
            {due > 0 && <Chip className="border-accent/50 text-accent">{due} к повторению</Chip>}
          </div>
        </div>
      </Card>

      {meta.atomIds.length > 0 && (
        <Card className="p-0">
          <button onClick={() => setHowOpen((v) => !v)} aria-expanded={howOpen}
            className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left">
            <span className="font-display text-[15px] font-bold text-text">Из чего складывается процент</span>
            <ChevronDown size={17} className={cn('shrink-0 text-muted transition-transform', howOpen && 'rotate-180')} aria-hidden />
          </button>
          {howOpen && (
            <div className="space-y-3 border-t border-line-soft px-5 py-4 text-sm leading-relaxed text-muted">
              <p>
                Процент раздела это <b>средний уровень владения его вопросами</b>. У каждого уровень от 0 до {MAX_MASTERY}.
                Ответил с первого раза, уровень растёт. Ответил во втором заходе, уровень стоит. Не смог дважды, уровень падает.
              </p>
              <div className="space-y-2 rounded-xl border border-line bg-surface-2 p-3">
                <p className="flex items-center justify-between gap-3"><span>Освоено</span><span className="font-bold tabular-nums text-text">{Math.round(stats.mastery * 100)}%</span></p>
                <p className="flex items-center justify-between gap-3"><span>Теория прочитана</span><span className="font-bold tabular-nums text-text">{stats.readCount} / {stats.readTotal}</span></p>
                <p className="flex items-center justify-between gap-3"><span>Экзамен раздела</span><span className="font-bold tabular-nums text-text">{stats.exam ? `${stats.exam.best}%` : 'не сдавал'}</span></p>
              </div>
              <p className="text-xs">Чтение теории и карточки на процент не влияют: они дают XP и подсветку слабых мест.</p>
            </div>
          )}
        </Card>
      )}

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
                  const terms = island.atoms.filter((a) => a.lesson === l.id).length
                  return (
                    <div key={l.id} className="flex items-stretch gap-2">
                      <Link to={`/lesson/${l.id}`} className="press-3d-sm flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 [--press-edge:var(--border)]">
                        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl font-display text-xs font-black',
                          read ? 'bg-success text-on-primary' : 'bg-surface-3 text-muted')}>
                          {read ? <Check size={16} aria-hidden /> : l.id.split('.').pop()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-[15px] font-bold leading-tight text-text line-clamp-2">{l.titleRu ?? l.title}</span>
                          <span className="block truncate text-xs text-muted">
                            {l.id}{terms > 0 && ` · ${terms} ${plural(terms, 'вопрос', 'вопроса', 'вопросов')}`}
                          </span>
                        </span>
                      </Link>
                      {terms > 0 && (
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

          {tab === 'train' && (
            <Card className="space-y-4">
              <div>
                <h2 className="font-display text-lg font-extrabold">{hasTerms ? 'Тренировка терминов' : 'Вопросы раздела'}</h2>
                <p className="mt-1 text-sm text-muted">
                  {hasTerms
                    ? 'Незнакомые термины идут стопкой карточек, дальше вопросы разных форматов по уровню владения.'
                    : 'Проверочные вопросы курса из этого раздела, ровно в том виде, в каком они идут на netacad.'}
                </p>
                <p className="mt-2 rounded-xl border border-line bg-surface-2 p-3 text-xs leading-relaxed text-muted">
                  Ошибся, и вопрос откладывается. В конце будет <b>один</b> второй заход по всем промахам.
                  Процент считается только по ответам <b>с первого раза</b>.
                </p>
              </div>
              <Bar value={stats.mastery} />
              <div className="flex flex-wrap gap-1.5 text-xs text-muted">
                <Chip>{due} к повторению</Chip>
                <Chip>{stats.weak.length} слабых</Chip>
              </div>
              <Button full size="lg" icon={<Play size={18} />} disabled={!meta.atomIds.length} onClick={() => nav(`/session/learn/${id}`)}>
                {meta.atomIds.length ? 'Начать' : 'Вопросов нет'}
              </Button>
              {stats.weak.length > 0 && (
                <Button full variant="surface" onClick={() => nav(`/session/review/${id}`)}>Только слабые места</Button>
              )}
            </Card>
          )}

          {tab === 'cards' && (
            <>
              <Card className="space-y-3">
                <h2 className="font-display text-lg font-extrabold">Флеш-карточки</h2>
                <p className="text-sm text-muted">Быстрый прогон терминов раздела. На уровень не влияет, отмеченные «не знал» попадают в слабые места.</p>
                <Button full size="lg" icon={<Layers size={18} />} onClick={() => nav(`/session/flash/${id}`)}>
                  Прогнать {island.atoms.length} {plural(island.atoms.length, 'карточку', 'карточки', 'карточек')}
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

          {tab === 'exam' && (
            <Card className="space-y-4">
              <h2 className="font-display text-lg font-extrabold">Экзамен раздела</h2>
              <p className="text-sm text-muted">
                Прогон по <b>всем {meta.atomIds.length}</b> вопросам раздела, без второго захода. Проходной балл {PASS_SCORE}%.
              </p>
              {stats.exam && (
                <div className="flex flex-wrap gap-1.5">
                  <Chip className={stats.exam.passed ? 'border-success/50 text-success' : ''}>Лучший: {stats.exam.best}%</Chip>
                  <Chip>{stats.exam.attempts} {plural(stats.exam.attempts, 'попытка', 'попытки', 'попыток')}</Chip>
                </div>
              )}
              <Button full size="lg" variant="violet" icon={<GraduationCap size={18} />} disabled={!meta.atomIds.length} onClick={() => nav(`/session/exam/${id}`)}>
                {meta.atomIds.length ? 'Сдавать экзамен' : 'Вопросов нет'}
              </Button>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  )
}
