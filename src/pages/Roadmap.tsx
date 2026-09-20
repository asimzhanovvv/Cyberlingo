import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Flag, Lock, Star, Trophy } from 'lucide-react'
import { moduleMeta, type IslandMeta } from '@/content'
import { checkpointAfter, FINAL_KEY, loadBank, questionsFor, rangeOf, type BankQ, type Checkpoint } from '@/content/bank'
import { useIslandStats, useUnlocked, PASS_SCORE } from '@/lib/progressSelectors'
import { useProgress } from '@/store/progress'
import { useBank } from '@/store/bank'
import { Ring } from '@/components/ui/Ring'
import { IslandIcon } from '@/components/ui/IslandIcon'
import { Card } from '@/components/ui/Card'
import { cn, plural } from '@/lib/utils'

const PALETTE = ['var(--primary)', 'var(--violet)', 'var(--accent)', 'var(--success)', 'var(--danger)']
const colorOf = (n: number) => PALETTE[(n - 1) % PALETTE.length]

const OFFSETS = [-64, 0, 64, 0]
const offsetAt = (i: number) => OFFSETS[i % OFFSETS.length]

const ICONS = ['ShieldAlert', 'Radar', 'Network', 'Bug', 'Smartphone', 'Fingerprint', 'Wrench', 'VenetianMask']
const iconOf = (id: string) => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ICONS[Math.abs(h) % ICONS.length]
}

function Trail({ from, to }: { from: number; to: number }) {
  const w = 200, h = 40, cx = w / 2
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <path
        d={`M ${cx + from} 0 C ${cx + from} ${h * 0.6}, ${cx + to} ${h * 0.4}, ${cx + to} ${h}`}
        fill="none" stroke="var(--border)" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 12"
      />
    </svg>
  )
}

function IslandNode({ meta, index, color, locked }: { meta: IslandMeta; index: number; color: string; locked: boolean }) {
  const s = useIslandStats(meta)
  const empty = meta.atomIds.length === 0

  return (
    <Link
      to={`/island/${meta.id}`}
      style={{ transform: `translateX(${offsetAt(index)}px)` }}
      className={cn('press-3d-sm flex flex-col items-center gap-2 rounded-3xl p-1 [--press-edge:transparent]', locked && 'opacity-60')}
    >
      <div className="relative">
        <Ring value={s.rings.total} size={92} stroke={8} color={locked ? 'var(--surface-3)' : color}>
          <span
            className={cn(
              'grid h-[68px] w-[68px] place-items-center rounded-full border-2 transition-all',
              locked ? 'border-line bg-surface-2 text-muted'
                : s.done ? 'border-transparent text-on-primary'
                : 'border-line bg-surface-2 text-text',
            )}
            style={s.done && !locked ? { background: color } : undefined}
          >
            {locked ? <Lock size={24} aria-hidden /> : <IslandIcon name={meta.hand ? 'ShieldAlert' : iconOf(meta.id)} />}
          </span>
        </Ring>
        {s.done && !locked && (
          <span className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full border-2 border-bg" style={{ background: color }}>
            <Check size={14} className="text-on-primary" aria-hidden />
          </span>
        )}
        {!locked && !s.started && !empty && (
          <motion.span
            className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-accent"
            animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 2.2 }}
          >
            <Star size={14} className="text-on-accent" aria-hidden />
          </motion.span>
        )}
      </div>
      <div className="max-w-44 text-center">
        <p className="font-display text-[15px] font-extrabold leading-tight text-text">{meta.id} {meta.title}</p>
        <p className="text-xs text-muted">
          {locked ? 'Закрыто'
            : empty ? `${meta.lessons} ${plural(meta.lessons, 'урок', 'урока', 'уроков')}, без вопросов`
            : `${Math.round(s.rings.total * 100)}%`}
        </p>
      </div>
    </Link>
  )
}

/** Узел checkpoint exam между группами модулей, как в netacad. */
function CheckpointNode({ cp, count }: { cp: Checkpoint; count: number }) {
  const best = useBank((s) => s.runs[cp.key]?.best)
  const passed = (best ?? 0) >= PASS_SCORE

  return (
    <Link
      to={`/exam/run/${cp.key}`}
      className="press-3d-sm block w-full rounded-3xl border-2 border-dashed border-accent/50 bg-accent/8 p-4 [--press-edge:var(--accent-deep)]"
    >
      <div className="flex items-center gap-3">
        <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl',
          passed ? 'bg-success text-on-primary' : 'bg-accent/20 text-accent')}>
          {passed ? <Check size={22} aria-hidden /> : <Flag size={22} aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-extrabold leading-tight text-text">{cp.label}</p>
          <p className="text-xs text-muted">
            {rangeOf(cp)}{count > 0 && ` · ${count} ${plural(count, 'вопрос', 'вопроса', 'вопросов')}`}
          </p>
        </div>
        {best !== undefined && (
          <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold',
            passed ? 'bg-success/15 text-success' : 'bg-accent/15 text-accent')}>
            {best}%
          </span>
        )}
      </div>
    </Link>
  )
}

/** Финальный экзамен в самом конце пути. */
function FinalNode({ count }: { count: number }) {
  const best = useBank((s) => s.runs[FINAL_KEY]?.best)
  const passed = (best ?? 0) >= PASS_SCORE

  return (
    <Link
      to={`/exam/run/${FINAL_KEY}`}
      className="press-3d-sm block w-full rounded-3xl border-2 border-violet/50 bg-violet/10 p-5 [--press-edge:var(--violet-deep)]"
    >
      <div className="flex items-center gap-3">
        <span className={cn('grid h-14 w-14 shrink-0 place-items-center rounded-2xl',
          passed ? 'bg-success text-on-primary' : 'bg-violet text-on-primary')}>
          <Trophy size={26} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-black leading-tight text-text">Final Exam</p>
          <p className="text-xs text-muted">
            вопросы по всему курсу{count > 0 && ` · ${count} ${plural(count, 'вопрос', 'вопроса', 'вопросов')}`}
          </p>
        </div>
        {best !== undefined && (
          <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold',
            passed ? 'bg-success/15 text-success' : 'bg-accent/15 text-accent')}>
            {best}%
          </span>
        )}
      </div>
    </Link>
  )
}

export default function Roadmap() {
  const unlocked = useUnlocked()
  const touchStreak = useProgress((s) => s.touchStreak)
  const [bank, setBank] = useState<BankQ[] | null>(null)

  useEffect(() => { touchStreak() }, [touchStreak])
  useEffect(() => { void loadBank().then(setBank) }, [])

  const countFor = (key: string) => (bank ? questionsFor(bank, [key]).length : 0)
  const lastModule = moduleMeta.length ? moduleMeta[moduleMeta.length - 1].id : 0

  return (
    <div className="space-y-8">
      <Card className="border-primary/30 bg-linear-to-br from-primary/12 to-transparent">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Cisco Cybersecurity Essentials</p>
        <h1 className="mt-1 font-display text-2xl font-black leading-tight">Путь по курсу</h1>
        <p className="mt-1.5 text-sm text-muted">
          {moduleMeta.length} модулей курса. Каждый островок это подраздел: теория, термины, экзамен.
          После группы модулей идёт checkpoint exam, в самом конце final exam.
        </p>
      </Card>

      {moduleMeta.map((m) => {
        const color = colorOf(m.id)
        const cp = checkpointAfter(m.id)
        return (
          <section key={m.id} className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl font-display text-lg font-black text-on-primary" style={{ background: color }}>
                {m.id}
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-lg font-extrabold leading-tight">{m.title}</h2>
                <p className="text-xs text-muted">
                  {m.islands.length} {plural(m.islands.length, 'раздел', 'раздела', 'разделов')} ·{' '}
                  {m.islands.reduce((s, i) => s + i.atomIds.length, 0)} вопросов
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center">
              {m.islands.map((isl, i) => (
                <div key={isl.id} className="flex flex-col items-center">
                  <IslandNode meta={isl} index={i} color={color} locked={!unlocked.has(isl.id)} />
                  {i < m.islands.length - 1 && <Trail from={offsetAt(i)} to={offsetAt(i + 1)} />}
                </div>
              ))}
            </div>

            {cp && (
              <div className="flex flex-col items-center">
                <Trail from={offsetAt(m.islands.length - 1)} to={0} />
                <CheckpointNode cp={cp} count={countFor(cp.key)} />
              </div>
            )}

            {m.id === lastModule && (
              <div className="flex flex-col items-center">
                <Trail from={0} to={0} />
                <FinalNode count={countFor(FINAL_KEY)} />
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
