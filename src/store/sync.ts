import { supabase } from '@/lib/supabase'
import { useProgress } from './progress'
import type { AtomProgress, IslandResult } from '@/types'

let timer: ReturnType<typeof setTimeout> | null = null
let pushing = false

export async function pullRemote(userId: string) {
  if (!supabase) return
  const [p, l, i, st] = await Promise.all([
    supabase.from('progress').select('*').eq('user_id', userId),
    supabase.from('lesson_reads').select('*').eq('user_id', userId),
    supabase.from('island_results').select('*').eq('user_id', userId),
    supabase.from('user_stats').select('*').eq('user_id', userId).maybeSingle(),
  ])

  const atoms: Record<string, AtomProgress> = {}
  for (const r of p.data ?? []) {
    atoms[r.atom_id] = {
      m: r.mastery ?? 0,
      due: r.due ? Date.parse(r.due) : 0,
      right: r.right_count ?? 0,
      wrong: r.wrong_count ?? 0,
      seen: r.seen ?? 0,
      u: r.updated_at ? Date.parse(r.updated_at) : 0,
    }
  }
  const lessonsRead: Record<string, number> = {}
  for (const r of l.data ?? []) lessonsRead[r.lesson_id] = r.read_at ? Date.parse(r.read_at) : Date.now()

  const islands: Record<string, IslandResult> = {}
  for (const r of i.data ?? []) {
    islands[r.island_id] = {
      best: r.best_score ?? 0,
      attempts: r.attempts ?? 0,
      passed: !!r.passed,
      u: r.updated_at ? Date.parse(r.updated_at) : 0,
    }
  }

  useProgress.getState().hydrateRemote({
    atoms,
    lessonsRead,
    islands,
    xp: st.data?.xp ?? 0,
    streak: st.data?.streak ?? 0,
    lastActive: st.data?.last_active ?? null,
  })
}

export async function pushNow() {
  const s = useProgress.getState()
  if (!supabase || !s.userId || pushing) return
  const ids = Object.keys(s.dirty)
  pushing = true
  try {
    if (ids.length) {
      const rows = ids
        .filter((id) => s.atoms[id])
        .map((id) => ({
          user_id: s.userId,
          atom_id: id,
          mastery: s.atoms[id].m,
          due: new Date(s.atoms[id].due).toISOString(),
          right_count: s.atoms[id].right,
          wrong_count: s.atoms[id].wrong,
          seen: s.atoms[id].seen,
          updated_at: new Date(s.atoms[id].u).toISOString(),
        }))
      if (rows.length) {
        const { error } = await supabase.from('progress').upsert(rows, { onConflict: 'user_id,atom_id' })
        if (!error) s.clearDirty(ids)
      }
    }

    const lessons = Object.entries(s.lessonsRead).map(([lesson_id, ts]) => ({
      user_id: s.userId, lesson_id, read_at: new Date(ts).toISOString(),
    }))
    if (lessons.length) await supabase.from('lesson_reads').upsert(lessons, { onConflict: 'user_id,lesson_id' })

    const islands = Object.entries(s.islands).map(([island_id, r]) => ({
      user_id: s.userId, island_id, best_score: r.best, attempts: r.attempts, passed: r.passed,
      updated_at: new Date(r.u).toISOString(),
    }))
    if (islands.length) await supabase.from('island_results').upsert(islands, { onConflict: 'user_id,island_id' })

    await supabase.from('user_stats').upsert(
      { user_id: s.userId, xp: s.xp, streak: s.streak, last_active: s.lastActive },
      { onConflict: 'user_id' },
    )
  } finally {
    pushing = false
  }
}

export function schedulePush(delay = 2500) {
  if (!supabase || !useProgress.getState().userId) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => void pushNow(), delay)
}

/** Подписка на изменения стора: любой ответ ставит отложенную отправку. */
export function initSync() {
  if (!supabase) return
  useProgress.subscribe(() => schedulePush())
  window.addEventListener('beforeunload', () => void pushNow())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void pushNow()
  })
}
