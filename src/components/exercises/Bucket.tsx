import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { shuffle } from '@/engine/generate'
import { cn } from '@/lib/utils'
import { Feedback, Prompt, type CheckState, type ExerciseProps } from './shared'

/**
 * Сортировка по категориям. Вернуть карточку обратно можно только крестиком,
 * поэтому промах по корзине не выбрасывает уже разложенное.
 */
export function BucketView({ ex, onDone }: ExerciseProps) {
  if (ex.format !== 'bucket') return null
  const cards = useMemo(() => shuffle(ex.cards), [ex.key])
  const [placed, setPlaced] = useState<Record<string, string>>({})
  const [active, setActive] = useState<string | null>(null)
  const [state, setState] = useState<CheckState>('idle')

  const left = cards.filter((c) => !placed[c.id])
  const allPlaced = left.length === 0
  const byId = (id: string) => cards.find((c) => c.id === id)!
  const wrongIds = Object.keys(placed).filter((id) => byId(id).bucket !== placed[id])

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <Prompt ex={ex} />

      <div className="sticky top-0 z-10 -mx-1 rounded-2xl bg-bg/90 px-1 py-2 backdrop-blur">
        <div className="min-h-14 rounded-2xl border border-dashed border-line bg-surface-2/50 p-2.5">
          <div className="flex flex-wrap gap-2">
            {left.length === 0 && <p className="px-2 py-1 text-sm text-muted">Все карточки разложены</p>}
            {left.map((c) => (
              <button
                key={c.id} onClick={() => setActive(active === c.id ? null : c.id)} disabled={state !== 'idle'}
                className={cn(
                  'press-3d-sm max-w-full rounded-xl border-2 px-3 py-2 text-left text-sm font-semibold leading-snug',
                  active === c.id ? 'border-primary bg-primary/15 text-primary [--press-edge:var(--primary-deep)]' : 'border-line bg-surface text-text',
                )}
              >
                {c.text}
              </button>
            ))}
          </div>
        </div>
        {active && <p className="px-1 pt-1.5 text-xs text-primary">Теперь нажми на категорию ниже</p>}
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {ex.buckets.map((b) => (
          <div
            key={b}
            onClick={() => { if (active && state === 'idle') { setPlaced((p) => ({ ...p, [active]: b })); setActive(null) } }}
            className={cn(
              'min-h-28 rounded-2xl border-2 p-3 transition-colors',
              state === 'idle' && active ? 'cursor-pointer border-dashed border-primary/60 bg-primary/5' : 'border-line bg-surface-2',
            )}
          >
            <p className="mb-2 font-display text-sm font-extrabold uppercase tracking-wider text-primary">{b}</p>
            <div className="space-y-1.5">
              {cards.filter((c) => placed[c.id] === b).map((c) => {
                const ok = state !== 'idle' && !wrongIds.includes(c.id)
                const bad = state !== 'idle' && wrongIds.includes(c.id)
                return (
                  <span
                    key={c.id}
                    className={cn(
                      'flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold leading-snug',
                      state === 'idle' && 'border-line bg-surface text-text',
                      ok && 'border-success bg-success/15 text-success',
                      bad && 'border-danger bg-danger/15 text-danger',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      {c.text}
                      {bad && <span className="mt-0.5 block text-[11px] font-bold text-success">верно: {c.bucket}</span>}
                    </span>
                    {state === 'idle' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setPlaced((p) => { const n = { ...p }; delete n[c.id]; return n }) }}
                        aria-label="Вернуть карточку"
                        className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface-3 text-muted hover:text-text"
                      >
                        <X size={12} aria-hidden />
                      </button>
                    )}
                  </span>
                )
              })}
              {cards.filter((c) => placed[c.id] === b).length === 0 && (
                <span className="block rounded-lg border border-dashed border-line px-2.5 py-2 text-xs text-muted">пусто</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto">
        <Feedback
          state={state} lesson={ex.lesson} canCheck={allPlaced}
          onCheck={() => setState(wrongIds.length === 0 ? 'right' : 'wrong')}
          explain={state === 'wrong' ? `Не в той категории: ${wrongIds.length}. Правильные подписаны зелёным.` : undefined}
          onContinue={() => onDone(state === 'right')}
        />
      </div>
    </div>
  )
}
