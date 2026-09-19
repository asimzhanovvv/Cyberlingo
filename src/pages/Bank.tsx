import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, FileQuestion, GraduationCap, Loader2, RotateCcw } from 'lucide-react'
import { loadBank, groupsOf, questionsFor, type BankGroup, type BankQ } from '@/content/bank'
import { useBank, wrongIds } from '@/store/bank'
import { Card, Chip } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn, plural } from '@/lib/utils'

const sizes = [
  { n: 0, label: 'Все вопросы' },
  { n: 20, label: '20' },
  { n: 40, label: '40' },
  { n: 60, label: '60' },
]

const tabs = [
  { kind: 'module', label: 'Модули' },
  { kind: 'quiz', label: 'Квизы' },
  { kind: 'final', label: 'Финал' },
] as const

export default function Bank() {
  const nav = useNavigate()
  const [bank, setBank] = useState<BankQ[] | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const [size, setSize] = useState(0)
  const [tab, setTab] = useState<(typeof tabs)[number]['kind']>('module')
  const seen = useBank((s) => s.seen)
  const runs = useBank((s) => s.runs)

  useEffect(() => { void loadBank().then(setBank) }, [])

  const groups = useMemo(() => (bank ? groupsOf(bank) : []), [bank])
  const shown = groups.filter((g) => (tab === 'final' ? g.kind !== 'module' && g.kind !== 'quiz' : g.kind === tab))
  const total = useMemo(
    () => (bank && picked.length ? questionsFor(bank, picked).length : 0),
    [bank, picked],
  )
  const wrong = wrongIds(seen)

  const toggle = (k: string) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))
  const start = () => nav(`/exam/run/${picked.join('-')}${size ? `?n=${size}` : ''}`)

  if (!bank) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-muted">
        <Loader2 size={18} className="animate-spin" aria-hidden /> Загружаю банк вопросов
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-black leading-tight">Экзамен</h1>
        <p className="mt-1 text-sm text-muted">
          {bank.length} реальных вопросов курса: выбор ответа, выбор нескольких, сопоставление и распределение по категориям.
          Эти прогоны идут отдельно и на процент островов не влияют.
        </p>
      </div>

      {wrong.length > 0 && (
        <Card className="flex items-center gap-3 border-danger/30">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-danger/15 text-danger">
            <RotateCcw size={20} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[15px] font-bold text-text">Мои ошибки</span>
            <span className="block text-xs text-muted">{wrong.length} {plural(wrong.length, 'вопрос', 'вопроса', 'вопросов')} с последним неверным ответом</span>
          </span>
          <Button size="sm" variant="danger" onClick={() => nav('/exam/run/wrong')}>Прогнать</Button>
        </Card>
      )}

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {tabs.map((t) => (
          <button
            key={t.kind} onClick={() => setTab(t.kind)}
            className={cn(
              'press-3d-sm shrink-0 rounded-2xl border px-4 py-2.5 font-display text-sm font-extrabold uppercase tracking-wide',
              tab === t.kind ? 'border-primary bg-primary/15 text-primary [--press-edge:var(--primary-deep)]' : 'border-line bg-surface-2 text-muted',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {shown.map((g: BankGroup) => {
          const on = picked.includes(g.key)
          const run = runs[g.key]
          return (
            <button
              key={g.key} onClick={() => toggle(g.key)}
              className={cn(
                'press-3d-sm flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left',
                on ? 'border-primary bg-primary/10 [--press-edge:var(--primary-deep)]' : 'border-line bg-surface-2 [--press-edge:var(--border)]',
              )}
            >
              <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-md border-2', on ? 'border-primary bg-primary text-on-primary' : 'border-muted')}>
                {on && <Check size={14} aria-hidden />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[15px] font-bold text-text">{g.label}</span>
                <span className="block truncate text-xs text-muted">
                  {g.count} {plural(g.count, 'вопрос', 'вопроса', 'вопросов')}{g.hint && ` · ${g.hint}`}
                </span>
              </span>
              {run && (
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-bold', run.best >= 80 ? 'bg-success/15 text-success' : 'bg-accent/15 text-accent')}>
                  {run.best}%
                </span>
              )}
            </button>
          )
        })}
      </div>

      <Card className="space-y-3">
        <h2 className="font-display text-base font-extrabold">Объём</h2>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <button
              key={s.n} onClick={() => setSize(s.n)}
              className={cn('rounded-xl border-2 px-4 py-2 font-display text-sm font-bold',
                size === s.n ? 'border-primary bg-primary/10 text-primary' : 'border-line bg-surface-2 text-muted')}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip><FileQuestion size={13} aria-hidden /> выбрано {total} {plural(total, 'вопрос', 'вопроса', 'вопросов')}</Chip>
          {size > 0 && total > size && <Chip>покажем {size} случайных</Chip>}
        </div>
        <Button full size="lg" variant="violet" icon={<GraduationCap size={18} />} disabled={!picked.length} onClick={start}>
          Начать
        </Button>
      </Card>
    </div>
  )
}
