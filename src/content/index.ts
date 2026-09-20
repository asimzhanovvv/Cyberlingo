import { useSyncExternalStore } from 'react'
import type { Atom, Island, Lesson } from '@/types'
import { island_1_1 } from './m1-1'
import { island_1_2 } from './m1-2'
import { island_1_3 } from './m1-3'
import { island_1_4 } from './m1-4'
import { island_1_5 } from './m1-5'
import { island_1_6 } from './m1-6'
import { island_2_1 } from './m2-1'
import { island_2_2 } from './m2-2'
import { island_2_3 } from './m2-3'
import { autoModules, loadAutoModule, autoModuleCache, autoModuleLoaded, moduleOfIsland } from './course'

/* ======================================================================
   Реестр контента. Ручные острова лежат в .ts и всегда доступны,
   автоимпортированные подтягиваются модулем по требованию.
   ====================================================================== */

/** Острова, собранные вручную. Они главнее автоимпорта с тем же id. */
const handIslands: Island[] = [
  island_1_1, island_1_2, island_1_3, island_1_4, island_1_5, island_1_6,
  island_2_1, island_2_2, island_2_3,
]
const handById = new Map(handIslands.map((i) => [i.id, i]))

export interface IslandMeta {
  id: string
  moduleId: number
  title: string
  lessons: number
  atomIds: string[]
  hand: boolean
}

export interface ModuleMeta {
  id: number
  title: string
  islands: IslandMeta[]
}

function buildMeta(): ModuleMeta[] {
  const handIds = new Set(handIslands.map((i) => i.id))
  const out: ModuleMeta[] = autoModules.map((m) => ({
    id: m.id,
    title: m.title,
    // автоостров с тем же id выбрасываем: ручной точнее и содержит термины
    islands: m.islands
      .filter((i) => !handIds.has(i.id))
      .map((i) => ({
        id: i.id, moduleId: m.id, title: i.title, lessons: i.lessons, atomIds: i.atoms, hand: false,
      })),
  }))
  // ручные острова встают на своё место по номеру
  for (const isl of handIslands) {
    const mod = out.find((m) => m.id === isl.moduleId)
    const meta: IslandMeta = {
      id: isl.id, moduleId: isl.moduleId, title: isl.titleRu,
      lessons: isl.lessons.length, atomIds: isl.atoms.map((a) => a.id), hand: true,
    }
    if (!mod) { out.push({ id: isl.moduleId, title: isl.title, islands: [meta] }); continue }
    const at = mod.islands.findIndex((x) => x.id > isl.id)
    if (at === -1) mod.islands.push(meta)
    else mod.islands.splice(at, 0, meta)
  }
  return out.sort((a, b) => a.id - b.id)
}

export const moduleMeta: ModuleMeta[] = buildMeta()
export const islandMetaById = new Map(moduleMeta.flatMap((m) => m.islands).map((i) => [i.id, i]))
export const allIslandMeta: IslandMeta[] = moduleMeta.flatMap((m) => m.islands)
export const islandOrder: string[] = allIslandMeta.map((i) => i.id)
export const allAtomIds: string[] = allIslandMeta.flatMap((i) => i.atomIds)

/* ------------------------- загрузка модулей ------------------------- */

let version = 0
const listeners = new Set<() => void>()
const bump = () => { version++; listeners.forEach((l) => l()) }

export function subscribeContent(l: () => void) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

/** Перерисовывает компонент, когда догрузился очередной модуль. */
export const useContentVersion = () =>
  useSyncExternalStore(subscribeContent, () => version, () => version)

export async function ensureModules(ids: number[]): Promise<void> {
  const need = Array.from(new Set(ids)).filter((id) => !autoModuleLoaded(id))
  if (!need.length) return
  await Promise.all(need.map((id) => loadAutoModule(id)))
  bump()
}

export const ensureIsland = (islandId: string) =>
  handById.has(islandId) ? Promise.resolve() : ensureModules([moduleOfIsland(islandId)])

export const isModuleReady = (id: number) => autoModuleLoaded(id)

/* --------------------------- синхронный доступ ---------------------- */

function loadedIslands(): Island[] {
  const out: Island[] = [...handIslands]
  for (const m of moduleMeta) {
    const cached = autoModuleCache(m.id)
    if (cached) for (const i of cached) if (!handById.has(i.id)) out.push(i)
  }
  return out
}

export const allIslands = (): Island[] => loadedIslands()
export const allAtoms = (): Atom[] => loadedIslands().flatMap((i) => i.atoms)
export const allLessons = (): Lesson[] => loadedIslands().flatMap((i) => i.lessons)

export function getIsland(id: string): Island | undefined {
  const hand = handById.get(id)
  if (hand) return hand
  return autoModuleCache(moduleOfIsland(id))?.find((i) => i.id === id)
}

export function getLesson(id: string): { lesson: Lesson; island: Island } | undefined {
  const islandId = id.split('.').slice(0, 2).join('.')
  const island = getIsland(islandId)
  const lesson = island?.lessons.find((l) => l.id === id)
  return island && lesson ? { lesson, island } : undefined
}

export function getAtom(id: string): Atom | undefined {
  const islandId = id.split('-')[0]
  return getIsland(islandId)?.atoms.find((a) => a.id === id)
}

export const getModuleMeta = (id: number) => moduleMeta.find((m) => m.id === id)
export const atomsForIsland = (id: string) => getIsland(id)?.atoms ?? []
export const atomsForModules = (ids: number[]) =>
  loadedIslands().filter((i) => ids.includes(i.moduleId)).flatMap((i) => i.atoms)

/** Модули, которые надо подгрузить, чтобы показать эти атомы. */
export const modulesOfAtoms = (atomIds: string[]) =>
  Array.from(new Set(atomIds.map((a) => Number(a.split('.')[0])).filter((n) => !Number.isNaN(n))))
