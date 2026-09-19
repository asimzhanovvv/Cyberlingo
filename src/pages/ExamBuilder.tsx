import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, GraduationCap, Loader2 } from 'lucide-react'
import { ensureModules, moduleMeta } from '@/content'
import { Card, Chip } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn, plural } from '@/lib/utils'

const sizes = [
  { n: 0, label: 'Полный прогон', hint: 'каждый вопрос минимум один раз' },
  { n: 20, label: '20 вопросов', hint: 'быстрая проверка' },
  { n: 40, label: '40 вопросов', hint: 'средний заход' },
  { n: 60, label: '60 вопросов', hint: 'длинная сессия' },
]

export default function ExamBuilder() {
  const nav = useNavigate()
  const ready = moduleMeta.filter((m) => m.islands.some((i) => i.atomIds.length))
  const [picked, setPicked] = useState<number[]>([1])
  const [size, setSize] = useState(0)
  const [busy, setBusy] = useState(false)

  const count = useMemo(
    () => moduleMeta.filter((m) => picked.includes(m.id)).reduce((s, m) => s + m.islands.reduce((n, i) => n + i.atomIds.length, 0), 0),
    [picked],
  )

  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const start = async () => {
    setBusy(true)
    const ids = picked.slice().sort((a, b) => a - b)
    await ensureModules(ids)
    setBusy(false)
    nav(`/session/exam/m${ids.join('-')}${size ? `?n=${size}` : ''}`)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-black leading-tight">Термины</h1>
        <p className="mt-1 text-sm text-muted">
          Прогон по базе вопросов выбранных модулей. При полном прогоне ни один вопрос не пропускается.
          Эти ответы поднимают процент разделов на карте.
        </p>
      </div>

      <Card className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-extrabold">Модули</h2>
          <button onClick={() => setPicked(picked.length === ready.length ? [] : ready.map((m) => m.id))}
            className="text-xs font-bold text-primary hover:underline">
            {picked.length === ready.length ? 'снять всё' : 'выбрать все'}
          </button>
        </div>
        <div className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
          {moduleMeta.map((m) => {
            const n = m.islands.reduce((s, i) => s + i.atomIds.length, 0)
            const empty = n === 0
            const on = picked.includes(m.id)
            return (
              <button key={m.id} onClick={() => !empty && toggle(m.id)} disabled={empty}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-colors',
                  empty ? 'border-dashed border-line bg-transparent opacity-45'
                    : on ? 'border-primary bg-primary/10' : 'border-line bg-surface-2',
                )}>
                <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-md border-2',
                  on && !empty ? 'border-primary bg-primary text-on-primary' : 'border-muted')}>
                  {on && !empty && <Check size={14} aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-sm font-bold text-text">{m.id}. {m.title}</span>
                  <span className="block truncate text-xs text-muted">{empty ? 'вопросов нет' : `${n} ${plural(n, 'вопрос', 'вопроса', 'вопросов')}`}</span>
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      <Card className="space-y-2">
        <h2 className="font-display text-base font-extrabold">Объём</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {sizes.map((s) => (
            <button key={s.n} onClick={() => setSize(s.n)}
              className={cn('rounded-2xl border-2 p-3 text-left transition-colors',
                size === s.n ? 'border-primary bg-primary/10' : 'border-line bg-surface-2')}>
              <span className="block font-display text-sm font-extrabold text-text">{s.label}</span>
              <span className="block text-xs text-muted">{s.hint}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <Chip>{count} {plural(count, 'вопрос', 'вопроса', 'вопросов')} в выборке</Chip>
          <Chip>{size === 0 ? 'полное покрытие' : `${size} вопросов`}</Chip>
        </div>
        <Button full size="lg" variant="violet" icon={busy ? <Loader2 size={18} className="animate-spin" /> : <GraduationCap size={18} />}
          disabled={!picked.length || busy} onClick={() => void start()}>
          {busy ? 'Загружаю модули' : 'Начать проверку'}
        </Button>
      </Card>
    </div>
  )
}
