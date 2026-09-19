import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { shuffle } from '@/engine/generate'
import { Md } from '@/components/ui/Md'
import { cn } from '@/lib/utils'
import { Feedback, Prompt, type CheckState, type ExerciseProps } from './shared'

/**
 * Длинная формулировка остаётся строкой во всю ширину, а категория выбирается
 * выпадающим списком прямо в ней. Так же, как в оригинальной активности курса.
 */
export function SelectView({ ex, onDone }: ExerciseProps) {
  if (ex.format !== 'select') return null
  const rows = useMemo(() => shuffle(ex.cards), [ex.key])
  const options = useMemo(() => shuffle(ex.buckets), [ex.key])
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [state, setState] = useState<CheckState>('idle')

  const allPicked = rows.every((r) => picked[r.id])
  const wrong = rows.filter((r) => picked[r.id] !== r.bucket)

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <Prompt ex={ex} />
      <div className="space-y-2.5">
        {rows.map((r) => {
          const val = picked[r.id]
          const ok = state !== 'idle' && val === r.bucket
          const bad = state !== 'idle' && val !== r.bucket
          return (
            <div
              key={r.id}
              className={cn(
                'rounded-2xl border-2 p-3 transition-colors',
                state === 'idle' && (val ? 'border-primary/50 bg-primary/5' : 'border-line bg-surface-2'),
                ok && 'border-success bg-success/10',
                bad && 'border-danger bg-danger/10',
              )}
            >
              <p className="text-sm leading-snug text-text/90"><Md text={r.text} /></p>
              <div className="relative mt-2.5">
                <select
                  value={val ?? ''}
                  disabled={state !== 'idle'}
                  onChange={(e) => setPicked((p) => ({ ...p, [r.id]: e.target.value }))}
                  aria-label="Выбери вариант"
                  className={cn(
                    'w-full appearance-none rounded-xl border-2 bg-surface px-3.5 py-2.5 pr-10 font-display text-sm font-bold outline-none transition-colors',
                    state === 'idle' && (val ? 'border-primary text-primary' : 'border-line text-muted'),
                    ok && 'border-success text-success',
                    bad && 'border-danger text-danger',
                  )}
                >
                  <option value="" disabled>Выбрать…</option>
                  {options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <ChevronDown
                  size={18}
                  className={cn('pointer-events-none absolute right-3 top-1/2 -translate-y-1/2',
                    val && state === 'idle' ? 'text-primary' : 'text-muted')}
                  aria-hidden
                />
              </div>
              {bad && <p className="mt-1.5 text-xs font-semibold text-success">верно: {r.bucket}</p>}
            </div>
          )
        })}
      </div>

      <div className="mt-auto">
        <Feedback
          state={state} lesson={ex.lesson} canCheck={allPicked}
          onCheck={() => setState(wrong.length === 0 ? 'right' : 'wrong')}
          explain={state === 'wrong' ? `Неверных строк: ${wrong.length} из ${rows.length}. Правильные подписаны зелёным.` : undefined}
          onContinue={() => onDone(state === 'right')}
        />
      </div>
    </div>
  )
}
