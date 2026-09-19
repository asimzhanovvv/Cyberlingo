import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { answerMatches } from '@/engine/generate'
import { Md } from '@/components/ui/Md'
import { cn } from '@/lib/utils'
import { Feedback, Prompt, type CheckState, type ExerciseProps } from './shared'

function ClozeText({ text, filled }: { text: string; filled?: string }) {
  const parts = text.split('___')
  return (
    <p className="font-display text-xl font-bold leading-snug text-text">
      <Md text={parts[0] ?? ''} />
      <span className={cn(
        'mx-1 inline-block min-w-24 rounded-lg border-b-4 px-2 text-center align-baseline',
        filled ? 'border-primary bg-primary/15 text-primary' : 'border-dashed border-muted text-transparent',
      )}>
        {filled ?? ' '}
      </span>
      <Md text={parts[1] ?? ''} />
    </p>
  )
}

export function ChoiceView({ ex, onDone }: ExerciseProps) {
  if (ex.format !== 'mcq_term' && ex.format !== 'mcq_def' && ex.format !== 'cloze' && ex.format !== 'truefalse') return null
  const [sel, setSel] = useState<string | null>(null)
  const [state, setState] = useState<CheckState>('idle')

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <Prompt ex={ex} />
      {ex.format === 'cloze' ? (
        <ClozeText text={ex.question} filled={sel ?? undefined} />
      ) : (
        <p className={cn('leading-snug text-text', ex.format === 'mcq_def' ? 'font-display text-3xl font-black' : 'text-lg')}>
          <Md text={ex.question} />
        </p>
      )}

      <div className={cn('mt-5 grid gap-2.5', ex.format === 'truefalse' && 'grid-cols-2')}>
        {ex.options.map((opt) => {
          const chosen = sel === opt
          const isAnswer = opt === ex.answer
          return (
            <button
              key={opt}
              onClick={() => state === 'idle' && setSel(opt)}
              disabled={state !== 'idle'}
              className={cn(
                'press-3d-sm rounded-2xl border-2 px-4 py-3.5 text-left text-[15px] leading-snug transition-colors',
                'border-line bg-surface-2 text-text [--press-edge:var(--border)]',
                chosen && state === 'idle' && 'border-primary bg-primary/12 text-primary [--press-edge:var(--primary-deep)]',
                state !== 'idle' && isAnswer && 'border-success bg-success/15 text-success',
                state === 'wrong' && chosen && !isAnswer && 'border-danger bg-danger/15 text-danger',
                state !== 'idle' && !isAnswer && !chosen && 'opacity-45',
              )}
            >
              <Md text={opt} />
            </button>
          )
        })}
      </div>

      <div className="mt-auto">
        <Feedback
          state={state} lesson={ex.lesson} canCheck={!!sel}
          onCheck={() => setState(sel === ex.answer ? 'right' : 'wrong')}
          explain={state === 'wrong' ? (ex.explain ? `Ответ: ${ex.answer}. ${ex.explain}` : `Ответ: ${ex.answer}`) : ex.explain}
          onContinue={() => onDone(state === 'right')}
        />
      </div>
    </div>
  )
}

export function TypeView({ ex, onDone }: ExerciseProps) {
  if (ex.format !== 'type') return null
  const [val, setVal] = useState('')
  const [state, setState] = useState<CheckState>('idle')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  const check = () => setState(answerMatches(val, ex.accepted) ? 'right' : 'wrong')

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <Prompt ex={ex} />
      <p className="text-lg leading-snug text-text"><Md text={ex.question} /></p>
      <label className="mt-5 block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Термин на английском</span>
        <input
          ref={ref} value={val} onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && state === 'idle' && val.trim()) check() }}
          disabled={state !== 'idle'} autoCapitalize="off" autoCorrect="off" spellCheck={false}
          className={cn(
            'w-full rounded-2xl border-2 bg-surface-2 px-4 py-3.5 font-mono text-lg text-text outline-none transition-colors',
            state === 'idle' && 'border-line focus:border-primary',
            state === 'right' && 'border-success text-success',
            state === 'wrong' && 'border-danger text-danger',
          )}
        />
      </label>
      <div className="mt-auto">
        <Feedback
          state={state} lesson={ex.lesson} canCheck={!!val.trim()} onCheck={check}
          explain={state === 'wrong' ? `Правильно: ${ex.answer}${ex.explain ? '. ' + ex.explain : ''}` : ex.explain}
          onContinue={() => onDone(state === 'right')}
        />
      </div>
    </div>
  )
}

export function MultiView({ ex, onDone }: ExerciseProps) {
  if (ex.format !== 'multi') return null
  const [sel, setSel] = useState<string[]>([])
  const [state, setState] = useState<CheckState>('idle')

  const toggle = (o: string) => setSel((s) => (s.includes(o) ? s.filter((x) => x !== o) : [...s, o]))
  const correct = sel.length === ex.answers.length && ex.answers.every((a) => sel.includes(a))

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <Prompt ex={ex} />
      <p className="font-display text-2xl font-black leading-snug text-text"><Md text={ex.question} /></p>
      <p className="mt-1 text-sm text-muted">Верных вариантов: {ex.answers.length}</p>
      <div className="mt-4 space-y-2.5">
        {ex.options.map((o) => {
          const chosen = sel.includes(o)
          const isAnswer = ex.answers.includes(o)
          return (
            <button
              key={o} onClick={() => state === 'idle' && toggle(o)} disabled={state !== 'idle'}
              className={cn(
                'press-3d-sm flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-[15px] leading-snug',
                'border-line bg-surface-2 text-text',
                chosen && state === 'idle' && 'border-primary bg-primary/12 text-primary',
                state !== 'idle' && isAnswer && 'border-success bg-success/15 text-success',
                state !== 'idle' && chosen && !isAnswer && 'border-danger bg-danger/15 text-danger',
              )}
            >
              <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md border-2', chosen ? 'border-current' : 'border-muted')}>
                {chosen && <Check size={13} />}
              </span>
              <Md text={o} />
            </button>
          )
        })}
      </div>
      <div className="mt-auto">
        <Feedback
          state={state} lesson={ex.lesson} canCheck={sel.length > 0}
          onCheck={() => setState(correct ? 'right' : 'wrong')}
          explain={state === 'wrong' ? `Верно: ${ex.answers.join(', ')}` : ex.explain}
          onContinue={() => onDone(state === 'right')}
        />
      </div>
    </div>
  )
}
