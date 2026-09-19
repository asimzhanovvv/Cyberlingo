import type { AtomProgress } from '@/types'
import { useProgress } from '@/store/progress'
import { mastered } from '@/engine/srs'
import { islandOrder, islandMetaById, type IslandMeta } from '@/content'

export const PASS_SCORE = 80

/** Процент острова считается по id его вопросов, сам модуль грузить не надо. */
export function masteryOf(atomIds: string[], atoms: Record<string, AtomProgress>): number {
  if (!atomIds.length) return 0
  let sum = 0
  for (const id of atomIds) sum += mastered(atoms[id])
  return sum / atomIds.length
}

export function useIslandStats(meta: IslandMeta | undefined) {
  const atoms = useProgress((s) => s.atoms)
  const lessonsRead = useProgress((s) => s.lessonsRead)
  const result = useProgress((s) => (meta ? s.islands[meta.id] : undefined))

  if (!meta) {
    return { mastery: 0, readCount: 0, readTotal: 0, started: false, weak: [] as string[], exam: undefined, done: false }
  }

  const mastery = masteryOf(meta.atomIds, atoms)
  const readCount = Object.keys(lessonsRead).filter((id) => id.startsWith(meta.id + '.')).length
  const started = meta.atomIds.some((id) => atoms[id]?.seen)
  const weak = meta.atomIds.filter((id) => {
    const p = atoms[id]
    return p && p.seen > 0 && (p.wrong > 0 || p.m < 3)
  })

  return {
    mastery,
    readCount: Math.min(readCount, meta.lessons),
    readTotal: meta.lessons,
    started,
    weak,
    exam: result,
    done: (result?.passed ?? false) && mastery >= 0.6,
  }
}

/** Остров открыт, если предыдущий освоен наполовину, сдан экзамен или включён режим «всё открыто». */
export function useUnlocked(): Set<string> {
  const atoms = useProgress((s) => s.atoms)
  const islands = useProgress((s) => s.islands)
  const unlockAll = useProgress((s) => s.settings.unlockAll)

  const open = new Set<string>()
  if (unlockAll) { for (const id of islandOrder) open.add(id); return open }

  let allow = true
  for (const id of islandOrder) {
    if (allow) open.add(id)
    const meta = islandMetaById.get(id)
    const passed = islands[id]?.passed || (meta ? masteryOf(meta.atomIds, atoms) >= 0.5 : true)
    allow = allow && passed
  }
  return open
}
