import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { CloudOff, Loader2, ShieldCheck } from 'lucide-react'
import { cloudEnabled, supabase } from '@/lib/supabase'
import { useProgress } from '@/store/progress'
import { pullRemote } from '@/store/sync'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type Mode = 'in' | 'up'

/**
 * Экран входа/регистрации. Если Supabase не настроен (нет ключей в .env.local),
 * ворота пропускают сразу — приложение работает полностью офлайн, как раньше.
 * Если Supabase настроен, доступ к приложению открывается только после входа.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const setUser = useProgress((s) => s.setUser)
  const userId = useProgress((s) => s.userId)
  const [ready, setReady] = useState(false)
  const [mode, setMode] = useState<Mode>('in')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user.id ?? null
      setUser(id)
      if (id) void pullRemote(id)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const id = session?.user.id ?? null
      setUser(id)
      if (id) void pullRemote(id)
    })
    return () => sub.subscription.unsubscribe()
  }, [setUser])

  if (!cloudEnabled) return <>{children}</>

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary" aria-hidden />
      </div>
    )
  }

  if (userId) return <>{children}</>

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr(null); setNotice(null)
    const fn = mode === 'in' ? supabase!.auth.signInWithPassword : supabase!.auth.signUp
    const { data, error } = await fn.call(supabase!.auth, { email, password: pass })
    setBusy(false)
    if (error) { setErr(error.message); return }
    if (mode === 'up' && !data.session) {
      setNotice('Аккаунт создан. Проверь почту, если нужно подтверждение, и войди.')
      setMode('in')
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <img src="/icon.svg" alt="" className="h-16 w-16 animate-float" />
          <div>
            <h1 className="font-display text-2xl font-black">Cyberlingo</h1>
            <p className="text-sm text-muted">Тренажёр по Cybersecurity Essentials</p>
          </div>
        </div>

        <Card className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
            <button
              type="button"
              onClick={() => { setMode('in'); setErr(null); setNotice(null) }}
              className={cn('rounded-xl py-2 font-display text-sm font-bold transition-colors', mode === 'in' ? 'bg-primary text-on-primary' : 'text-muted')}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => { setMode('up'); setErr(null); setNotice(null) }}
              className={cn('rounded-xl py-2 font-display text-sm font-bold transition-colors', mode === 'up' ? 'bg-primary text-on-primary' : 'text-muted')}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input
              value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Почта" autoComplete="email" required
              className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm outline-none focus:border-primary"
            />
            <input
              value={pass} onChange={(e) => setPass(e.target.value)} type="password" placeholder="Пароль" minLength={6} required
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm outline-none focus:border-primary"
            />
            {err && <p className="text-sm text-danger">{err}</p>}
            {notice && <p className="text-sm text-success">{notice}</p>}
            <Button type="submit" full disabled={busy || !email || !pass}>
              {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : mode === 'in' ? 'Войти' : 'Создать аккаунт'}
            </Button>
          </form>
        </Card>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <ShieldCheck size={14} aria-hidden /> Прогресс синхронизируется через Supabase и доступен на любом устройстве
        </p>
      </div>
    </div>
  )
}

export function OfflineNotice() {
  return (
    <Card className="space-y-2 border-dashed">
      <div className="flex items-center gap-2 text-muted"><CloudOff size={18} aria-hidden /><span className="font-display text-[15px] font-bold">Синхронизация выключена</span></div>
      <p className="text-sm text-muted">
        Прогресс хранится только в этом браузере. Впиши ключи Supabase в файл <code className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-xs">.env.local</code> и перезапусти, чтобы прогресс переезжал между телефоном и компьютером.
      </p>
    </Card>
  )
}
