import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, Check, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Exercise } from '@/types'
import { Md } from '@/components/ui/Md'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { playCorrect, playWrong } from '@/lib/sound'

export interface ExerciseProps {
  ex: Exercise
  /** detail.unknown — атомы, которые в стопке карточек отмечены как «не знал». */
  onDone: (correct: boolean, detail?: { unknown?: string[] }) => void
}

export type CheckState = 'idle' | 'right' | 'wrong'

export function Prompt({ ex }: { ex: Exercise }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-bold uppercase tracking-widest text-primary">{ex.prompt}</p>
      {ex.hint && <p className="text-xs text-muted">{ex.hint}</p>}
    </div>
  )
}

/** Липкая нижняя панель: кнопка проверки, затем разбор ответа. */
export function Feedback({
  state, explain, lesson, onContinue, onCheck, canCheck, checkLabel = 'Проверить',
}: {
  state: CheckState
  explain?: string
  lesson: string
  onContinue: () => void
  onCheck: () => void
  canCheck: boolean
  checkLabel?: string
}) {
  useEffect(() => {
    if (state === 'right') playCorrect()
    else if (state === 'wrong') playWrong()
  }, [state])

  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-line bg-surface/95 px-4 pt-3 backdrop-blur safe-b">
      <AnimatePresence>
        {state !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={cn(
              'mb-3 flex items-start gap-3 rounded-2xl border p-3',
              state === 'right' ? 'border-success/40 bg-success/12' : 'border-danger/40 bg-danger/12',
            )}
          >
            <span className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full', state === 'right' ? 'bg-success' : 'bg-danger')}>
              {state === 'right' ? <Check size={16} className="text-on-primary" /> : <X size={16} className="text-on-primary" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn('font-display text-sm font-extrabold', state === 'right' ? 'text-success' : 'text-danger')}>
                {state === 'right' ? 'Верно' : 'Неверно'}
              </p>
              {explain && <p className="mt-0.5 text-sm leading-relaxed text-muted"><Md text={explain} /></p>}
              {lesson && (
                <Link to={`/lesson/${lesson}`} className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                  <BookOpen size={13} aria-hidden /> Читать теорию {lesson}
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="pb-3">
        {state === 'idle' ? (
          <Button full size="lg" disabled={!canCheck} onClick={onCheck}>{checkLabel}</Button>
        ) : (
          <Button full size="lg" variant={state === 'right' ? 'success' : 'danger'} onClick={onContinue}>Продолжить</Button>
        )}
      </div>
    </div>
  )
}
