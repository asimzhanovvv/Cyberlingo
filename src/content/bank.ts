import type { Exercise } from '@/types'

/** Вопрос из банка, подготовленного отдельно. Не связан с атомами терминов. */
export interface BankQ {
  id: string
  n: number
  q: string
  modules: string[]
  type: 'mcq' | 'multi' | 'match' | 'dropdown'
  options?: string[]
  answers?: string[]
  pairs?: { item: string; match: string }[]
  pool?: string[]
}

export type GroupKind = 'module' | 'quiz' | 'final' | 'end' | 'other'

export interface BankGroup {
  key: string
  kind: GroupKind
  label: string
  hint: string
  count: number
}

let cache: BankQ[] | null = null

/** Банк грузится отдельным чанком, чтобы не утяжелять стартовый бандл. */
export async function loadBank(): Promise<BankQ[]> {
  if (!cache) {
    const mod = await import('./bank.json')
    cache = (mod.default ?? mod) as unknown as BankQ[]
  }
  return cache
}

export const UNTAGGED = 'none'

export function groupsOf(bank: BankQ[]): BankGroup[] {
  const count = new Map<string, number>()
  for (const q of bank) {
    const keys = q.modules.length ? q.modules : [UNTAGGED]
    for (const k of keys) count.set(k, (count.get(k) ?? 0) + 1)
  }

  const meta = (key: string): Omit<BankGroup, 'count' | 'key'> => {
    if (key === 'F1') return { kind: 'final', label: 'Финальный экзамен', hint: 'вопросы по всему курсу' }
    if (key === 'end') return { kind: 'end', label: 'Итоговый модуль', hint: 'завершающий блок' }
    if (key === UNTAGGED) return { kind: 'other', label: 'Без модуля', hint: 'тег модуля не проставлен' }
    if (key.startsWith('Q')) return { kind: 'quiz', label: `Квиз ${key.slice(1)}`, hint: 'по группе модулей' }
    return { kind: 'module', label: `Модуль ${key.slice(1)}`, hint: '' }
  }

  const order = (k: string) => {
    if (k.startsWith('M')) return 1000 + Number(k.slice(1))
    if (k.startsWith('Q')) return 2000 + Number(k.slice(1))
    if (k === 'end') return 3000
    if (k === 'F1') return 4000
    return 5000
  }

  return Array.from(count.entries())
    .map(([key, n]) => ({ key, count: n, ...meta(key) }))
    .sort((a, b) => order(a.key) - order(b.key))
}

export function questionsFor(bank: BankQ[], keys: string[]): BankQ[] {
  const set = new Set(keys)
  return bank.filter((q) => (q.modules.length ? q.modules : [UNTAGGED]).some((m) => set.has(m)))
}

let seq = 0

/** Вопрос банка превращается в то же упражнение, что и термины: те же экраны. */
export function toExercise(q: BankQ): Exercise | null {
  const key = `${q.id}-${(seq++).toString(36)}`
  const base = { key, atomIds: [q.id], lesson: '' }

  if (q.type === 'mcq' && q.options?.length && q.answers?.length) {
    return { ...base, format: 'mcq_term', prompt: 'Выбери верный ответ', question: q.q, options: q.options, answer: q.answers[0] }
  }
  if (q.type === 'multi' && q.options?.length && q.answers?.length) {
    return { ...base, format: 'multi', prompt: 'Выбери все верные', question: q.q, options: q.options, answers: q.answers }
  }
  if (q.type === 'match' && q.pairs && q.pairs.length >= 2) {
    return {
      ...base, format: 'match', prompt: 'Сопоставь пары', hint: q.q,
      pairs: q.pairs.map((p, i) => ({ id: `${q.id}-${i}`, left: p.item, right: p.match })),
    }
  }
  if (q.type === 'dropdown' && q.pairs && q.pool && q.pool.length >= 2) {
    return {
      ...base, format: 'select', prompt: 'Выбери вариант для каждой строки', hint: q.q,
      buckets: q.pool,
      cards: q.pairs.map((p, i) => ({ id: `${q.id}-${i}`, text: p.item, bucket: p.match })),
    }
  }
  return null
}

/** Текст правильного ответа для экрана разбора. */
export function answerText(q: BankQ): string {
  if (q.type === 'mcq' || q.type === 'multi') return (q.answers ?? []).join(' · ')
  return (q.pairs ?? []).map((p) => `${p.item} → ${p.match}`).join('\n')
}
