import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDown, ChevronLeft, ChevronRight, Image as ImageIcon, Info,
  Lightbulb, MessageCircle, RefreshCw, Target, TriangleAlert,
} from 'lucide-react'
import type { Block } from '@/types'
import { Md } from '@/components/ui/Md'
import { cn } from '@/lib/utils'

/* ------------------------------ заметки ------------------------------ */

const noteStyle = {
  tip: { icon: Lightbulb, ring: 'border-accent/40 bg-accent/10', tone: 'text-accent', label: 'Подсказка' },
  exam: { icon: Target, ring: 'border-violet/40 bg-violet/10', tone: 'text-violet', label: 'На экзамене' },
  warn: { icon: TriangleAlert, ring: 'border-danger/40 bg-danger/10', tone: 'text-danger', label: 'Внимание' },
  info: { icon: Info, ring: 'border-primary/40 bg-primary/10', tone: 'text-primary', label: 'Важно' },
  avatar: { icon: MessageCircle, ring: 'border-line bg-surface-2', tone: 'text-muted', label: 'Заметка курса' },
} as const

function Note({ b }: { b: Extract<Block, { t: 'note' }> }) {
  const s = noteStyle[b.variant]
  const Icon = s.icon
  return (
    <div className={cn('rounded-2xl border p-4', s.ring)}>
      <div className={cn('mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider', s.tone)}>
        <Icon size={15} aria-hidden /> {b.title ?? s.label}
      </div>
      <p className="text-[15px] leading-relaxed text-text/90"><Md text={b.md} /></p>
    </div>
  )
}

/* ---------------------------- flip-карточки --------------------------- */

function FlipCard({ front, back }: { front: string; back: string }) {
  const [open, setOpen] = useState(false)
  return (
    <button
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      className={cn(
        'press-3d-sm group relative w-full rounded-2xl border p-4 text-left transition-colors',
        open ? 'border-primary/50 bg-primary/10' : 'border-line bg-surface-2 hover:border-primary/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-display text-[15px] font-bold text-text">{front}</span>
        <RefreshCw size={15} className={cn('mt-1 shrink-0 text-muted transition-transform', open && 'rotate-180 text-primary')} aria-hidden />
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.p
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden text-sm leading-relaxed text-muted"
          >
            <span className="mt-2 block"><Md text={back} /></span>
          </motion.p>
        )}
      </AnimatePresence>
      {!open && <span className="mt-1 block text-xs text-muted">Нажми, чтобы открыть</span>}
    </button>
  )
}

/* ------------------------------ аккордеон ----------------------------- */

function Accordion({ items }: { items: { title: string; md: string; example?: string }[] }) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface-2">
      {items.map((it, i) => {
        const active = open === i
        return (
          <div key={i}>
            <button
              onClick={() => setOpen(active ? null : i)}
              aria-expanded={active}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
            >
              <span className={cn('font-display text-[15px] font-bold', active ? 'text-primary' : 'text-text')}>
                {i + 1}. {it.title}
              </span>
              <ChevronDown size={17} className={cn('shrink-0 text-muted transition-transform duration-200', active && 'rotate-180')} aria-hidden />
            </button>
            <AnimatePresence initial={false}>
              {active && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden"
                >
                  <div className="space-y-2 px-4 pb-4 text-[15px] leading-relaxed text-muted">
                    <p><Md text={it.md} /></p>
                    {it.example && (
                      <p className="rounded-xl border border-line bg-surface px-3 py-2 text-sm">
                        <span className="font-semibold text-accent">Пример. </span>
                        <Md text={it.example} />
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------ карусель ------------------------------ */

function Carousel({ slides }: { slides: { title: string; md: string }[] }) {
  const [i, setI] = useState(0)
  const go = (d: number) => setI((v) => (v + d + slides.length) % slides.length)
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }} className="min-h-28"
        >
          <h4 className="mb-1.5 font-display text-lg font-extrabold text-primary">{slides[i].title}</h4>
          <p className="text-[15px] leading-relaxed text-muted"><Md text={slides[i].md} /></p>
        </motion.div>
      </AnimatePresence>
      <div className="mt-4 flex items-center justify-between">
        <button onClick={() => go(-1)} aria-label="Предыдущий" className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-muted hover:text-text">
          <ChevronLeft size={18} aria-hidden />
        </button>
        <div className="flex gap-1.5" role="tablist">
          {slides.map((_, k) => (
            <button
              key={k} onClick={() => setI(k)} role="tab" aria-selected={k === i} aria-label={`Слайд ${k + 1}`}
              className={cn('h-2 rounded-full transition-all', k === i ? 'w-6 bg-primary' : 'w-2 bg-surface-3')}
            />
          ))}
        </div>
        <button onClick={() => go(1)} aria-label="Следующий" className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-muted hover:text-text">
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>
    </div>
  )
}

/* ------------------------- активность из курса ------------------------ */

function Activity({ b }: { b: Extract<Block, { t: 'activity' }> }) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [checked, setChecked] = useState(false)
  const allDone = b.items.every((_, i) => answers[i])

  return (
    <div className="rounded-2xl border border-violet/40 bg-violet/8 p-4">
      <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet">
        <Target size={15} aria-hidden /> Задание из курса
      </div>
      <h4 className="font-display text-base font-extrabold text-text">{b.title}</h4>
      <p className="mt-1 text-sm text-muted"><Md text={b.prompt} /></p>

      <div className="mt-3 space-y-3">
        {b.items.map((item, i) => {
          const chosen = answers[i]
          const right = checked && chosen === item.a
          const wrong = checked && chosen && chosen !== item.a
          return (
            <div key={i} className="rounded-xl border border-line bg-surface p-3">
              <p className="text-[14px] leading-relaxed text-text"><Md text={item.q} /></p>
              <div className="mt-2 flex flex-wrap gap-2">
                {b.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => !checked && setAnswers((a) => ({ ...a, [i]: opt }))}
                    disabled={checked}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                      chosen === opt ? 'border-primary bg-primary/15 text-primary' : 'border-line bg-surface-2 text-muted hover:text-text',
                      checked && opt === item.a && 'border-success bg-success/15 text-success',
                      wrong && chosen === opt && 'border-danger bg-danger/15 text-danger',
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {checked && (
                <p className={cn('mt-2 text-xs', right ? 'text-success' : 'text-danger')}>
                  {right ? 'Верно. ' : `Верный ответ: ${item.a}. `}
                  {item.why && <span className="text-muted"><Md text={item.why} /></span>}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setChecked(true)} disabled={!allDone || checked}
          className="press-3d-sm rounded-xl bg-violet px-4 py-2 text-sm font-display font-extrabold uppercase text-on-primary [--press-edge:var(--violet-deep)] disabled:opacity-40"
        >
          Проверить
        </button>
        {checked && (
          <button onClick={() => { setChecked(false); setAnswers({}) }} className="rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:text-text">
            Ещё раз
          </button>
        )}
      </div>
      {checked && b.feedback && (
        <p className="mt-3 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-muted"><Md text={b.feedback} /></p>
      )}
    </div>
  )
}

/* ------------------------------ таблица ------------------------------- */

function Table({ b }: { b: Extract<Block, { t: 'table' }> }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-line bg-surface-2">
      <div className="no-scrollbar overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-surface-3">
              {b.headers.map((h, i) => (
                <th key={i} className="px-3.5 py-2.5 font-display text-xs font-extrabold uppercase tracking-wider text-muted">
                  <Md text={h} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.rows.map((row, i) => (
              <tr key={i} className="border-t border-line-soft align-top">
                {row.map((cell, j) => (
                  <td key={j} className={cn('px-3.5 py-2.5 leading-relaxed', j === 0 ? 'text-text' : 'text-muted')}>
                    <Md text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {b.caption && <figcaption className="border-t border-line-soft px-3.5 py-2 text-xs text-muted">{b.caption}</figcaption>}
    </figure>
  )
}

/* ------------------------------ рендерер ------------------------------ */

export function BlockView({ b }: { b: Block }) {
  switch (b.t) {
    case 'p':
      return <p className="text-[15px] leading-relaxed text-text/85"><Md text={b.md} /></p>
    case 'h':
      return <h3 className="pt-1 font-display text-lg font-extrabold text-text">{b.text}</h3>
    case 'def':
      return (
        <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4">
          <div className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">Определение</div>
          <p className="font-display text-base font-extrabold text-text">{b.term}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-text/85"><Md text={b.md} /></p>
        </div>
      )
    case 'note':
      return <Note b={b} />
    case 'list':
      return b.ordered ? (
        <ol className="space-y-1.5 pl-1">
          {b.items.map((it, i) => (
            <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-text/85">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface-3 text-[11px] font-bold text-primary">{i + 1}</span>
              <span><Md text={it} /></span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="space-y-1.5">
          {b.items.map((it, i) => (
            <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-text/85">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <span><Md text={it} /></span>
            </li>
          ))}
        </ul>
      )
    case 'table':
      return <Table b={b} />
    case 'flip':
      return (
        <div className="space-y-2">
          {b.title && <p className="text-xs font-bold uppercase tracking-wider text-muted">{b.title}</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            {b.cards.map((c, i) => <FlipCard key={i} {...c} />)}
          </div>
        </div>
      )
    case 'accordion':
      return (
        <div className="space-y-2">
          {b.title && <p className="text-xs font-bold uppercase tracking-wider text-muted">{b.title}</p>}
          <Accordion items={b.items} />
        </div>
      )
    case 'carousel':
      return (
        <div className="space-y-2">
          {b.title && <p className="text-xs font-bold uppercase tracking-wider text-muted">{b.title}</p>}
          <Carousel slides={b.slides} />
        </div>
      )
    case 'activity':
      return <Activity b={b} />
    case 'figure':
      return (
        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-line bg-surface-2/60 p-4">
          <ImageIcon size={18} className="mt-0.5 shrink-0 text-muted" aria-hidden />
          <p className="text-sm italic leading-relaxed text-muted">Иллюстрация курса: <Md text={b.caption} /></p>
        </div>
      )
    case 'transcript':
      return (
        <details className="overflow-hidden rounded-2xl border border-line bg-surface-2">
          <summary className="cursor-pointer px-4 py-3 font-display text-[15px] font-bold text-text">
            {b.title ?? 'Транскрипт видео'}
          </summary>
          <div className="space-y-1.5 border-t border-line-soft px-4 py-3">
            {b.lines.map((l, i) => (
              <p key={i} className="flex gap-3 text-sm leading-relaxed text-muted">
                {l.time && <span className="shrink-0 font-mono text-xs text-primary/70">{l.time}</span>}
                <span><Md text={l.text} /></span>
              </p>
            ))}
          </div>
        </details>
      )
  }
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => <BlockView key={i} b={b} />)}
    </div>
  )
}
