import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { shuffle } from '@/engine/generate'
import { cn } from '@/lib/utils'
import { Feedback, Prompt, type CheckState, type ExerciseProps } from './shared'

/**
 * Пары собираются свободно: любой термин можно поставить к любому определению,
 * ошибки видно только после проверки. Термины короткие, поэтому они идут
 * компактными фишками сверху, а длинные определения строками во всю ширину.
 */
export function MatchView({ ex, onDone }: ExerciseProps) {
  if (ex.format !== 'match') return null
  const terms = useMemo(() => shuffle(ex.pairs), [ex.key])
  const rows = useMemo(() => shuffle(ex.pairs), [ex.key])
  const [placed, setPlaced] = useState<Record<string, string>>({}) // rowId -> termId
  const [active, setActive] = useState<string | null>(null)
  const [state, setState] = useState<CheckState>('idle')

  const usedTerms = new Set(Object.values(placed))
  const free = terms.filter((t) => !usedTerms.has(t.id))
  const allPlaced = Object.keys(placed).length === rows.length
  const wrongRows = rows.filter((r) => placed[r.id] !== r.id)
  const termById = (id: string) => ex.pairs.find((p) => p.id === id)!

  const putInto = (rowId: string) => {
    if (state !== 'idle' || !active) return
    setPlaced((p) => {
      const next = { ...p }
      for (const [k, v] of Object.entries(next)) if (v === active) delete next[k]
      next[rowId] = active
      return next
    })
    setActive(null)
  }

  const clear = (rowId: string) => {
    if (state !== 'idle') return
    setPlaced((p) => { const n = { ...p }; delete n[rowId]; return n })
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <Prompt ex={ex} />
      <p className="text-sm text-muted">
        {active ? 'Теперь нажми определение, которое подходит' : 'Выбери термин, затем его определение'}
      </p>

      <div className="sticky top-0 z-10 -mx-1 mt-3 rounded-2xl bg-bg/90 px-1 py-2 backdrop-blur">
        <div className="flex flex-wrap gap-2">
          {free.length === 0 && <p className="px-1 py-1.5 text-sm text-muted">Все термины расставлены</p>}
          {free.map((t) => (
            <button
              key={t.id} onClick={() => setActive(active === t.id ? null : t.id)} disabled={state !== 'idle'}
              className={cn(
                'press-3d-sm rounded-xl border-2 px-3 py-2 font-display text-sm font-bold transition-colors',
                active === t.id ? 'border-primary bg-primary/15 text-primary [--press-edge:var(--primary-deep)]' : 'border-line bg-surface-2 text-text',
              )}
            >
              {t.left}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        {rows.map((r) => {
          const termId = placed[r.id]
          const ok = state !== 'idle' && termId === r.id
          const bad = state !== 'idle' && termId !== r.id
          return (
            <div
              key={r.id}
              onClick={() => !termId && putInto(r.id)}
              className={cn(
                'rounded-2xl border-2 p-3 transition-colors',
                state === 'idle' && !termId && active && 'cursor-pointer border-dashed border-primary/60 bg-primary/5',
                state === 'idle' && (!active || termId) && 'border-line bg-surface-2',
                ok && 'border-success bg-success/10',
                bad && 'border-danger bg-danger/10',
              )}
            >
              <p className="text-sm leading-snug text-text/90">{r.right}</p>
              <div className="mt-2 flex items-center gap-2">
                {termId ? (
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-display text-sm font-bold',
                    state === 'idle' ? 'border-primary bg-primary/12 text-primary'
                      : ok ? 'border-success bg-success/15 text-success' : 'border-danger bg-danger/15 text-danger',
                  )}>
                    {termById(termId).left}
                    {state === 'idle' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); clear(r.id) }}
                        aria-label="Убрать термин"
                        className="ml-0.5 grid h-5 w-5 place-items-center rounded-full bg-surface-3 text-muted hover:text-text"
                      >
                        <X size={12} aria-hidden />
                      </button>
                    )}
                  </span>
                ) : (
                  <span className="rounded-lg border border-dashed border-line px-3 py-1 text-xs text-muted">
                    {active ? 'нажми сюда' : 'термин'}
                  </span>
                )}
                {bad && <span className="text-xs font-semibold text-success">верно: {r.left}</span>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-auto">
        <Feedback
          state={state} lesson={ex.lesson} canCheck={allPlaced}
          onCheck={() => setState(wrongRows.length === 0 ? 'right' : 'wrong')}
          explain={state === 'wrong' ? `Неверных пар: ${wrongRows.length} из ${rows.length}. Правильные подписаны зелёным.` : undefined}
          onContinue={() => onDone(state === 'right')}
        />
      </div>
    </div>
  )
}
