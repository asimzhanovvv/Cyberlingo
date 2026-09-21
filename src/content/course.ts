import type { Atom, Block, Island, Lesson, QuizPayload } from '@/types'
import manifestRaw from './auto/manifest.json'

/* ======================================================================
   Автоимпорт курса. Манифест грузится сразу (он лёгкий), содержимое
   модуля подтягивается отдельным чанком, когда до него доходят руки.
   ====================================================================== */

export interface AutoIslandMeta {
  id: string
  title: string
  lessons: number
  atoms: string[]
}

export interface AutoModuleMeta {
  id: number
  title: string
  islands: AutoIslandMeta[]
}

export const autoModules: AutoModuleMeta[] = (manifestRaw as { modules: AutoModuleMeta[] }).modules

const metaByIsland = new Map<string, { island: AutoIslandMeta; module: number }>()
for (const m of autoModules) for (const i of m.islands) metaByIsland.set(i.id, { island: i, module: m.id })

export const autoIslandMeta = (id: string) => metaByIsland.get(id)
export const moduleOfIsland = (id: string) => Number(id.split('.')[0])
export const moduleOfAtom = (atomId: string) => Number(atomId.split('.')[0])

interface RawIsland {
  id: string
  title: string
  lessons: { id: string; title: string; blocks: Block[] }[]
  quiz: (QuizPayload & { id: string; lesson: string })[]
}

interface RawModule {
  module: number
  title: string
  islands: RawIsland[]
}

/** Термины, написанные руками поверх автоимпорта: src/content/terms/m<N>.json.
 *  Лежат отдельно, чтобы повторный прогон импортёра их не затирал. */
interface RawTerms {
  module: number
  islands: Record<string, Atom[]>
}

const files = import.meta.glob<RawModule>('./auto/m*.json')
const termFiles = import.meta.glob<RawTerms>('./terms/m*.json')

const cache = new Map<number, Island[]>()
const inflight = new Map<number, Promise<Island[]>>()

function atomFromQuiz(q: QuizPayload & { id: string; lesson: string }, islandId: string): Atom {
  const answer =
    q.type === 'mcq' || q.type === 'multi'
      ? (q.answers ?? []).join(' · ')
      : (q.pairs ?? []).map((p) => p.match).join(' · ')
  return {
    id: q.id,
    lesson: q.lesson,
    kind: 'quiz',
    term: (answer || 'ответ').slice(0, 140),
    definition: q.q,
    group: islandId,
    groupLabel: islandId,
    ru: q.why,
    weight: 3,
    quiz: q,
  }
}

const ICONS = ['ShieldAlert', 'Radar', 'Network', 'Bug', 'Smartphone', 'Fingerprint', 'Wrench', 'VenetianMask']

function toIsland(raw: RawIsland, moduleId: number, terms: Atom[] = []): Island {
  const lessons: Lesson[] = raw.lessons.map((l) => ({
    id: l.id,
    title: l.title,
    kind: 'text',
    blocks: l.blocks,
  }))
  return {
    id: raw.id,
    moduleId,
    title: raw.title,
    titleRu: raw.title,
    objective: '',
    icon: ICONS[Math.abs(hash(raw.id)) % ICONS.length],
    lessons,
    atoms: [...raw.quiz.map((q) => atomFromQuiz(q, raw.id)), ...terms],
  }
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

/** Подгружает модуль и отдаёт его острова в формате приложения. */
export function loadAutoModule(id: number): Promise<Island[]> {
  const hit = cache.get(id)
  if (hit) return Promise.resolve(hit)
  const running = inflight.get(id)
  if (running) return running

  const loader = files[`./auto/m${id}.json`]
  if (!loader) {
    cache.set(id, [])
    return Promise.resolve([])
  }
  const termLoader = termFiles[`./terms/m${id}.json`]
  const p = Promise.all([loader(), termLoader ? termLoader() : Promise.resolve(null)]).then(
    ([mod, termMod]) => {
      const raw = ((mod as unknown as { default?: RawModule }).default ?? mod) as RawModule
      const terms =
        ((termMod as unknown as { default?: RawTerms } | null)?.default ??
          (termMod as RawTerms | null))?.islands ?? {}
      const islands = raw.islands.map((i) => toIsland(i, raw.module, terms[i.id] ?? []))
      cache.set(id, islands)
      inflight.delete(id)
      return islands
    },
  )
  inflight.set(id, p)
  return p
}

export const autoModuleLoaded = (id: number) => cache.has(id)
export const autoModuleCache = (id: number) => cache.get(id)
