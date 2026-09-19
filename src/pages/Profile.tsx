import { useEffect } from 'react'
import { Cloud, Flame, LogOut, Moon, Sun, Trash2, Unlock, Volume2, Zap } from 'lucide-react'
import { allAtomIds, moduleMeta } from '@/content'
import { useProgress } from '@/store/progress'
import { cloudEnabled, supabase } from '@/lib/supabase'
import { pushNow } from '@/store/sync'
import { OfflineNotice } from '@/components/auth/AuthGate'
import { Card, Chip } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Bar } from '@/components/ui/Ring'
import { cn, plural } from '@/lib/utils'

function Toggle({ on, onChange, label, hint, icon: Icon }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string; icon: typeof Moon }) {
  return (
    <button onClick={() => onChange(!on)} role="switch" aria-checked={on} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3.5 text-left">
      <Icon size={18} className={on ? 'text-primary' : 'text-muted'} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[15px] font-bold text-text">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', on ? 'bg-primary' : 'bg-surface-3')}>
        <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-surface transition-all', on ? 'left-6' : 'left-1')} />
      </span>
    </button>
  )
}

function Auth() {
  if (!cloudEnabled) return <OfflineNotice />

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2 text-success"><Cloud size={18} aria-hidden /><span className="font-display text-[15px] font-bold">Синхронизация включена</span></div>
      <p className="text-sm text-muted">Прогресс сохраняется в облаке и подтягивается на любом устройстве.</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="surface" onClick={() => void pushNow()}>Отправить сейчас</Button>
        <Button variant="surface" icon={<LogOut size={16} />} onClick={() => void supabase!.auth.signOut()}>Выйти</Button>
      </div>
    </Card>
  )
}

export default function Profile() {
  const { xp, streak, settings, setSettings, reset, atoms, lessonsRead } = useProgress()
  const seen = allAtomIds.filter((id) => atoms[id]?.seen).length
  const strong = allAtomIds.filter((id) => (atoms[id]?.m ?? 0) >= 4).length
  const lessonTotal = moduleMeta.reduce((s, m) => s + m.islands.reduce((n, i) => n + i.lessons, 0), 0)
  const read = Object.keys(lessonsRead).length

  useEffect(() => { document.documentElement.dataset.theme = settings.theme }, [settings.theme])

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-black leading-tight">Профиль</h1>

      <Card className="space-y-4">
        <div className="flex gap-2">
          <Chip className="border-accent/50 text-accent"><Flame size={14} aria-hidden /> {streak} {plural(streak, 'день', 'дня', 'дней')}</Chip>
          <Chip className="border-primary/50 text-primary"><Zap size={14} aria-hidden /> {xp} XP</Chip>
        </div>
        <div className="space-y-1.5">
          <p className="flex justify-between text-sm"><span className="text-muted">Вопросы изучены</span><span className="font-bold tabular-nums">{seen} / {allAtomIds.length}</span></p>
          <Bar value={seen / Math.max(1, allAtomIds.length)} />
        </div>
        <div className="space-y-1.5">
          <p className="flex justify-between text-sm"><span className="text-muted">Закреплены крепко</span><span className="font-bold tabular-nums">{strong} / {allAtomIds.length}</span></p>
          <Bar value={strong / Math.max(1, allAtomIds.length)} color="var(--success)" />
        </div>
        <div className="space-y-1.5">
          <p className="flex justify-between text-sm"><span className="text-muted">Подразделы прочитаны</span><span className="font-bold tabular-nums">{read} / {lessonTotal}</span></p>
          <Bar value={read / Math.max(1, lessonTotal)} color="var(--violet)" />
        </div>
      </Card>

      <Auth />

      <div className="space-y-2">
        <Toggle
          on={settings.theme === 'dark'} onChange={(v) => setSettings({ theme: v ? 'dark' : 'light' })}
          label="Тёмная тема" hint="светлая тема для дневного чтения" icon={settings.theme === 'dark' ? Moon : Sun}
        />
        <Toggle
          on={settings.unlockAll} onChange={(v) => setSettings({ unlockAll: v })}
          label="Открыть все острова" hint="убирает последовательную разблокировку" icon={Unlock}
        />
        <Toggle
          on={settings.sound} onChange={(v) => setSettings({ sound: v })}
          label="Звуки" hint="сигналы верного и неверного ответа, конец урока" icon={Volume2}
        />
      </div>

      <Card className="space-y-3 border-danger/30">
        <p className="text-sm text-muted">Сбросить весь прогресс: мастерство терминов, прочитанные подразделы, XP и серию.</p>
        <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => { if (confirm('Точно сбросить весь прогресс?')) reset() }}>
          Сбросить прогресс
        </Button>
      </Card>
    </div>
  )
}
