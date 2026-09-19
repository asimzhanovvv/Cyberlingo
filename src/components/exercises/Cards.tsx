import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, X } from 'lucide-react'
import { Md } from '@/components/ui/Md'
import { Button } from '@/components/ui/Button'
import { Bar } from '@/components/ui/Ring'
import { playFlip } from '@/lib/sound'
import { cn } from '@/lib/utils'
import { Prompt, type ExerciseProps } from './shared'

/**
 * Стопка новых терминов. Карточка переворачивается нажатием по ней самой,
 * внизу только «Знал» и «Не знал». Отмеченные «не знал» вернутся во втором
 * заходе отдельной короткой стопкой.
 */
export function StackView({ ex, onDone }: ExerciseProps) {
  if (ex.format !== 'stack') return null
  const [i, setI] = useState(0)
  const [open, setOpen] = useState(false)
  const [unknown, setUnknown] = useState<string[]>([])
  const card = ex.cards[i]
  const last = i === ex.cards.length - 1
  const behind = ex.cards.length - 1 - i

  const mark = (knew: boolean) => {
    const next = knew ? unknown : [...unknown, card.atomId]
    if (!knew) { setUnknown(next); playFlip() }
    if (last) onDone(true, { unknown: next })
    else { setI((v) => v + 1); setOpen(false) }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <Prompt ex={ex} />
      <div className="mb-4 flex items-center gap-3">
        <Bar value={i / ex.cards.length} className="h-2" color="var(--accent)" />
        <span className="shrink-0 font-display text-xs font-extrabold tabular-nums text-muted">{i + 1} / {ex.cards.length}</span>
      </div>

      <div className="relative pt-4">
        {/* следующие карточки выглядывают сверху */}
        {behind > 1 && <span className="absolute inset-x-8 top-0 h-6 rounded-3xl border border-line bg-surface-2/40" aria-hidden />}
        {behind > 0 && <span className="absolute inset-x-4 top-2 h-6 rounded-3xl border border-line bg-surface-2/70" aria-hidden />}
        <AnimatePresence mode="wait">
          <motion.button
            key={i}
            initial={{ opacity: 0, y: -14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => setOpen((v) => !v)}
            className="press-3d-sm relative flex min-h-64 w-full flex-col rounded-3xl border border-line bg-surface-2 p-6 text-left"
            aria-label="Перевернуть карточку"
          >
            {!open ? (
              <>
                <p className="text-xs font-bold uppercase tracking-widest text-muted">Термин</p>
                <p className="mt-3 font-display text-3xl font-black leading-tight text-text">{card.front}</p>
                <p className="mt-auto pt-6 text-sm text-muted">Нажми на карточку, чтобы увидеть определение</p>
              </>
            ) : (
              <>
                <p className="text-xs font-bold uppercase tracking-widest text-primary">{card.front}</p>
                <p className="mt-3 whitespace-pre-line text-[17px] leading-relaxed text-text"><Md text={card.back} /></p>
                {card.ru && <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-sm text-muted">{card.ru}</p>}
              </>
            )}
          </motion.button>
        </AnimatePresence>
      </div>

      <div className="mt-auto pt-6">
        {unknown.length > 0 && (
          <p className="mb-2 text-center text-xs text-muted">Вернутся во втором заходе: {unknown.length}</p>
        )}
        <div className={cn('grid grid-cols-2 gap-3 pb-3 transition-opacity', !open && 'pointer-events-none opacity-40')}>
          <Button variant="danger" size="lg" icon={<X size={17} />} onClick={() => mark(false)}>Не знал</Button>
          <Button variant="success" size="lg" icon={last ? <ArrowRight size={17} /> : <Check size={17} />} onClick={() => mark(true)}>
            {last ? 'Знал, дальше' : 'Знал'}
          </Button>
        </div>
        {!open && <p className="pb-3 text-center text-xs text-muted">Сначала посмотри определение</p>}
      </div>
    </div>
  )
}

/** Одиночная карточка — режим «Карточки» во вкладке острова. Прогресс не меняет. */
export function FlashcardView({ ex, onDone }: ExerciseProps) {
  if (ex.format !== 'flashcard') return null
  const [flipped, setFlipped] = useState(false)
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <Prompt ex={ex} />
      <button
        onClick={() => setFlipped((v) => !v)}
        className="press-3d-sm relative flex min-h-60 w-full flex-col rounded-3xl border border-line bg-surface-2 p-6 text-left"
        aria-label="Перевернуть карточку"
      >
        <AnimatePresence mode="wait">
          {!flipped ? (
            <motion.div key="f" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <p className="text-xs font-bold uppercase tracking-widest text-muted">Термин</p>
              <p className="mt-3 font-display text-3xl font-black leading-tight text-text">{ex.front}</p>
              <p className="mt-6 text-sm text-muted">Нажми на карточку, чтобы увидеть определение</p>
            </motion.div>
          ) : (
            <motion.div key="b" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">{ex.front}</p>
              <p className="mt-3 whitespace-pre-line text-[17px] leading-relaxed text-text"><Md text={ex.back} /></p>
              {ex.ru && <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-sm text-muted">{ex.ru}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </button>
      <div className="mt-auto pt-6">
        <div className={cn('grid grid-cols-2 gap-3 pb-3 transition-opacity', !flipped && 'pointer-events-none opacity-40')}>
          <Button variant="danger" size="lg" icon={<X size={17} />} onClick={() => onDone(false)}>Не знал</Button>
          <Button variant="success" size="lg" icon={<Check size={17} />} onClick={() => onDone(true)}>Знал</Button>
        </div>
      </div>
    </div>
  )
}
