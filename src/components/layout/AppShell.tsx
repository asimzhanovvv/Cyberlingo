import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Flame, GraduationCap, Map, Sparkles, Target, User, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import { useProgress } from '@/store/progress'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/', label: 'Карта', icon: Map, end: true },
  { to: '/terms', label: 'Термины', icon: Target },
  { to: '/exam', label: 'Экзамен', icon: GraduationCap },
  { to: '/review', label: 'Слабые', icon: Sparkles },
  { to: '/profile', label: 'Профиль', icon: User },
]

function Stat({ icon: Icon, value, tone }: { icon: typeof Zap; value: number | string; tone: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5">
      <Icon size={15} className={tone} aria-hidden />
      <span className="font-display text-sm font-extrabold tabular-nums text-text">{value}</span>
    </span>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const xp = useProgress((s) => s.xp)
  const streak = useProgress((s) => s.streak)
  const { pathname } = useLocation()
  // экраны прохождения идут без шапки и нижнего меню
  const bare = pathname.startsWith('/session') || pathname.startsWith('/exam/run')

  if (bare) return <>{children}</>

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col lg:flex-row lg:gap-6 lg:px-4">
      {/* боковая навигация на десктопе */}
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-1 py-6 lg:flex">
        <div className="mb-5 flex items-center gap-2 px-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary font-display text-lg font-black text-on-primary">C</span>
          <span className="font-display text-lg font-extrabold">Cyberlingo</span>
        </div>
        {nav.map((n) => (
          <NavLink
            key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-2xl px-3 py-2.5 font-display text-sm font-bold uppercase tracking-wide transition-colors',
              isActive ? 'bg-surface-2 text-primary' : 'text-muted hover:bg-surface/60 hover:text-text',
            )}
          >
            <n.icon size={19} aria-hidden /> {n.label}
          </NavLink>
        ))}
        <div className="mt-auto flex flex-wrap gap-2 px-1">
          <Stat icon={Flame} value={streak} tone="text-accent" />
          <Stat icon={Zap} value={xp} tone="text-primary" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line-soft bg-bg/85 px-4 py-3 backdrop-blur-lg safe-t lg:hidden">
          <span className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-display text-base font-black text-on-primary">C</span>
            <span className="font-display text-base font-extrabold">Cyberlingo</span>
          </span>
          <span className="flex gap-2">
            <Stat icon={Flame} value={streak} tone="text-accent" />
            <Stat icon={Zap} value={xp} tone="text-primary" />
          </span>
        </header>

        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
          className="flex-1 px-4 pb-28 pt-4 lg:pb-10 lg:pt-6"
        >
          {children}
        </motion.main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-lg safe-b lg:hidden">
          <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1.5">
            {nav.map((n) => (
              <NavLink
                key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => cn(
                  'flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold uppercase tracking-wide transition-colors',
                  isActive ? 'text-primary' : 'text-muted',
                )}
              >
                {({ isActive }) => (
                  <>
                    <n.icon size={20} aria-hidden className={isActive ? 'scale-110 transition-transform' : ''} />
                    {n.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
