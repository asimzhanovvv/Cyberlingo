import type { Atom, Exercise, ExerciseFormat, StackExercise } from '@/types'

/* ------------------------------ утилиты ------------------------------ */

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pick<T>(arr: readonly T[], n: number): T[] {
  return shuffle(arr).slice(0, n)
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9а-яё'\s-]/gi, ' ')
    .replace(/\b(the|a|an)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function answerMatches(input: string, accepted: string[]): boolean {
  const n = normalize(input)
  if (!n) return false
  return accepted.some((a) => normalize(a) === n)
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/** Короткий заголовок для кнопки ответа: длинные определения режем аккуратно. */
function trim(text: string, max = 160): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const i = cut.lastIndexOf(' ')
  return cut.slice(0, i > 60 ? i : max) + '…'
}

/* --------------------------- подбор мусора --------------------------- */

interface Pools {
  byGroup: Map<string, Atom[]>
  all: Atom[]
}

export function buildPools(atoms: Atom[]): Pools {
  const byGroup = new Map<string, Atom[]>()
  for (const a of atoms) {
    const list = byGroup.get(a.group)
    if (list) list.push(a)
    else byGroup.set(a.group, [a])
  }
  return { byGroup, all: atoms }
}

/** Дистракторы: сначала соседи по теме, потом любые. Никогда не повторяем ответ. */
function distractors(
  atom: Atom,
  pools: Pools,
  field: 'term' | 'definition',
  n: number,
  manual: string[] = [],
): string[] {
  const correct = normalize(atom[field])
  const seen = new Set([correct])
  const out: string[] = []

  const push = (raw: string) => {
    const v = raw.trim()
    if (!v) return
    const k = normalize(v)
    if (seen.has(k)) return
    seen.add(k)
    out.push(v)
  }

  for (const m of shuffle(manual)) push(m)

  // Сценарные атомы (bucket) и перечисления не годятся в варианты для обычного термина:
  // их «term» это целое предложение, и подделка сразу видна.
  const compatible = (x: Atom) =>
    atom.kind === 'bucket' || atom.kind === 'enum' ? x.kind === atom.kind : x.kind === 'term' || x.kind === 'fact'

  const siblings = (pools.byGroup.get(atom.group) ?? []).filter((x) => x.id !== atom.id && compatible(x))
  for (const s of shuffle(siblings)) {
    if (out.length >= n) break
    push(s[field])
  }
  if (out.length < n) {
    const rest = pools.all.filter((x) => x.id !== atom.id && x.group !== atom.group && compatible(x))
    for (const s of shuffle(rest)) {
      if (out.length >= n) break
      push(s[field])
    }
  }
  return out.slice(0, n)
}

/* ------------------------ какие форматы доступны --------------------- */

export function formatsFor(atom: Atom): ExerciseFormat[] {
  // Вопрос курса идёт как есть, генерировать из него другие форматы нельзя.
  if (atom.kind === 'quiz') return ['quiz']
  const f: ExerciseFormat[] = []
  if (atom.kind === 'enum') {
    f.push('flashcard', 'multi')
    if (atom.cloze) f.push('cloze')
    return f
  }
  f.push('flashcard', 'mcq_term', 'mcq_def', 'truefalse')
  if (atom.cloze) f.push('cloze')
  if (atom.term.length <= 42 && /[a-zA-Z]/.test(atom.term)) f.push('type')
  if (atom.kind === 'bucket') f.push('bucket')
  f.push('match')
  return f
}

/** Формат по уровню мастерства: от узнавания к воспроизведению. */
const LADDER: ExerciseFormat[][] = [
  ['mcq_term', 'multi'],
  ['mcq_term', 'mcq_def', 'multi'],
  ['mcq_def', 'truefalse', 'multi'],
  ['cloze', 'bucket', 'match'],
  ['cloze', 'type', 'match'],
  ['type', 'cloze', 'bucket'],
]

export function formatForMastery(atom: Atom, mastery: number, avoid?: ExerciseFormat): ExerciseFormat {
  if (atom.kind === 'quiz') return 'quiz'
  const supported = formatsFor(atom)
  const level = Math.max(0, Math.min(LADDER.length - 1, mastery))
  for (let step = 0; step < LADDER.length; step++) {
    const tier = LADDER[Math.min(LADDER.length - 1, level + step)]
    const options = tier.filter((f) => supported.includes(f) && f !== avoid)
    if (options.length) return options[Math.floor(Math.random() * options.length)]
  }
  const fallback = supported.filter((f) => f !== avoid && f !== 'match' && f !== 'bucket')
  return fallback[0] ?? 'flashcard'
}

/* ------------------------- сборка упражнений ------------------------- */

let seq = 0
const key = (f: string) => `${f}-${(seq++).toString(36)}`

export function buildExercise(atom: Atom, format: ExerciseFormat, pools: Pools): Exercise | null {
  const base = { atomIds: [atom.id], lesson: atom.lesson }

  switch (format) {
    case 'quiz': {
      const q = atom.quiz
      if (!q) return null
      const explain = q.why
      if (q.type === 'mcq' && q.options?.length && q.answers?.length) {
        return { ...base, key: key('qz'), format: 'mcq_term', prompt: 'Вопрос курса', question: q.q, options: q.options, answer: q.answers[0], explain }
      }
      if (q.type === 'multi' && q.options?.length && q.answers?.length) {
        return { ...base, key: key('qz'), format: 'multi', prompt: 'Выбери все верные', question: q.q, options: q.options, answers: q.answers, explain }
      }
      if (q.type === 'match' && q.pairs && q.pairs.length >= 2) {
        return { ...base, key: key('qz'), format: 'match', prompt: 'Сопоставь пары', hint: q.q,
          pairs: q.pairs.map((p, i) => ({ id: `${atom.id}-${i}`, left: p.item, right: p.match })) }
      }
      if (q.type === 'select' && q.pairs && q.pool && q.pool.length >= 2) {
        return { ...base, key: key('qz'), format: 'select', prompt: 'Выбери вариант для каждой строки', hint: q.q,
          buckets: q.pool, cards: q.pairs.map((p, i) => ({ id: `${atom.id}-${i}`, text: p.item, bucket: p.match })) }
      }
      return null
    }

    case 'flashcard':
      return {
        ...base, key: key('fc'), format: 'flashcard',
        prompt: 'Запомни карточку',
        front: atom.term,
        back: atom.kind === 'enum' && atom.items ? atom.items.map((i) => '• ' + i).join('\n') : atom.definition,
        ru: atom.ru,
      }

    case 'mcq_term': {
      const wrong = distractors(atom, pools, 'term', 3, atom.decoys ?? [])
      if (wrong.length < 2) return null
      return {
        ...base, key: key('mt'), format: 'mcq_term',
        prompt: 'Какой термин описан?',
        question: atom.definition,
        options: shuffle([atom.term, ...wrong]),
        answer: atom.term,
        explain: atom.ru,
      }
    }

    case 'mcq_def': {
      const wrong = distractors(atom, pools, 'definition', 3).map((d) => trim(d))
      if (wrong.length < 2) return null
      const correct = trim(atom.definition)
      if (wrong.some((w) => w === correct)) return null
      return {
        ...base, key: key('md'), format: 'mcq_def',
        prompt: 'Что означает термин?',
        question: atom.term,
        options: shuffle([correct, ...wrong]),
        answer: correct,
        explain: atom.ru,
      }
    }

    case 'cloze': {
      if (!atom.cloze) return null
      const answer = atom.clozeAnswer ?? atom.term
      const wrong = distractors({ ...atom, term: answer }, pools, 'term', 3, atom.decoys ?? [])
      if (wrong.length < 2) return null
      return {
        ...base, key: key('cz'), format: 'cloze',
        prompt: 'Дополни утверждение',
        question: atom.cloze,
        options: shuffle([answer, ...wrong]),
        answer,
        explain: atom.ru,
      }
    }

    case 'truefalse': {
      const isTrue = Math.random() < 0.5
      let shown = atom.definition
      if (!isTrue) {
        const other = distractors(atom, pools, 'definition', 1)
        if (!other.length) return null
        shown = other[0]
      }
      return {
        ...base, key: key('tf'), format: 'truefalse',
        prompt: 'Верно или нет?',
        question: `**${atom.term}** — ${trim(shown, 220)}`,
        options: ['Верно', 'Неверно'],
        answer: isTrue ? 'Верно' : 'Неверно',
        explain: isTrue ? atom.ru : `Правильно: ${trim(atom.definition, 220)}`,
      }
    }

    case 'type':
      return {
        ...base, key: key('ty'), format: 'type',
        prompt: 'Впиши термин по-английски',
        question: atom.definition,
        answer: atom.term,
        accepted: [atom.term, ...(atom.aliases ?? [])],
        explain: atom.ru,
      }

    case 'multi': {
      if (atom.kind !== 'enum' || !atom.items?.length) return null
      const noise = new Set<string>()
      for (const d of atom.decoys ?? []) noise.add(d)
      const siblings = (pools.byGroup.get(atom.group) ?? []).filter((x) => x.id !== atom.id)
      for (const s of shuffle(siblings)) {
        if (noise.size >= 4) break
        for (const it of s.items ?? [s.term]) {
          if (noise.size >= 4) break
          if (!atom.items.includes(it)) noise.add(it)
        }
      }
      if (noise.size < 2) return null
      const correct = atom.items.length > 6 ? pick(atom.items, 5) : atom.items
      return {
        ...base, key: key('ms'), format: 'multi',
        prompt: 'Выбери все верные пункты',
        question: atom.term,
        options: shuffle([...correct, ...Array.from(noise).slice(0, Math.max(2, 7 - correct.length))]),
        answers: correct,
        explain: atom.ru,
      }
    }

    default:
      return null
  }
}

/** match и bucket собираются из нескольких атомов сразу. */
export function buildGroupExercises(atoms: Atom[], format: 'match' | 'bucket'): Exercise[] {
  const out: Exercise[] = []
  const groups = new Map<string, Atom[]>()
  for (const a of atoms) {
    if (a.kind === 'quiz') continue
    if (format === 'bucket' && a.kind !== 'bucket') continue
    if (format === 'match' && a.kind === 'enum') continue
    const list = groups.get(a.group)
    if (list) list.push(a)
    else groups.set(a.group, [a])
  }

  for (const [group, list] of groups) {
    const label = list[0].groupLabel ?? group
    if (format === 'match') {
      if (list.length < 3) continue
      for (const part of chunk(shuffle(list), 4)) {
        if (part.length < 3) continue
        out.push({
          key: key('mh'), format: 'match',
          atomIds: part.map((a) => a.id),
          lesson: part[0].lesson,
          prompt: 'Сопоставь пары',
          hint: label,
          pairs: part.map((a) => ({ id: a.id, left: a.term, right: trim(a.definition, 88) })),
        })
      }
    } else {
      const buckets = Array.from(new Set(list.map((a) => a.bucket!).filter(Boolean)))
      if (buckets.length < 2) continue
      for (const part of chunk(shuffle(list), 6)) {
        if (part.length < 3) continue
        // Длинные формулировки читать в маленьких корзинах неудобно,
        // поэтому для них список выбора выносится в саму строку.
        const avg = part.reduce((s, a) => s + a.term.length, 0) / part.length
        out.push({
          key: key('bk'), format: avg > 60 ? 'select' : 'bucket',
          atomIds: part.map((a) => a.id),
          lesson: part[0].lesson,
          prompt: 'Разложи по категориям',
          hint: label,
          buckets,
          cards: part.map((a) => ({ id: a.id, text: a.term, bucket: a.bucket! })),
        })
      }
    }
  }
  return out
}


/** Стопка карточек: знакомство с новыми терминами одним экраном в начале урока. */
export function buildStack(atoms: Atom[]): StackExercise | null {
  if (!atoms.length) return null
  return {
    key: key('st'),
    format: 'stack',
    atomIds: atoms.map((a) => a.id),
    lesson: atoms[0].lesson,
    prompt: 'Новые термины',
    hint: 'Пролистай, дальше они пойдут вопросами',
    cards: atoms.map((a) => ({
      atomId: a.id,
      front: a.term,
      back: a.kind === 'enum' && a.items ? a.items.map((i) => '• ' + i).join('\n') : a.definition,
      ru: a.ru,
    })),
  }
}
