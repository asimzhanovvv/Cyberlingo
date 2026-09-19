/* Проверка контента: битые ссылки, дубли, покрытие форматами. */
import fs from 'node:fs'
import path from 'node:path'

const dir = 'src/content'
const files = fs.readdirSync(dir).filter((f) => /^m\d-\d\.ts$/.test(f))
let fail = 0
const seenAtom = new Set()
const seenLesson = new Set()
let totalAtoms = 0
let totalLessons = 0

for (const f of files) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8')
  const js = src.replace(/^import[^\n]*\n/, '').replace(/export const \w+: Island =/, 'export default')
  const tmp = path.join(process.env.TMPDIR || '/tmp', `cp-${f}.mjs`)
  fs.writeFileSync(tmp, js)
  const island = (await import('file://' + path.resolve(tmp))).default

  const lessonIds = new Set(island.lessons.map((l) => l.id))
  totalLessons += island.lessons.length
  totalAtoms += island.atoms.length

  for (const l of island.lessons) {
    if (seenLesson.has(l.id)) { console.error(`дубль урока ${l.id}`); fail++ }
    seenLesson.add(l.id)
    if (!l.blocks?.length) { console.error(`урок ${l.id} без блоков`); fail++ }
  }

  const groups = new Map()
  for (const a of island.atoms) {
    if (seenAtom.has(a.id)) { console.error(`дубль атома ${a.id}`); fail++ }
    seenAtom.add(a.id)
    if (!lessonIds.has(a.lesson)) { console.error(`атом ${a.id} ссылается на несуществующий урок ${a.lesson}`); fail++ }
    if (!a.term || !a.definition) { console.error(`атом ${a.id} без term или definition`); fail++ }
    if (a.kind === 'enum' && !a.items?.length) { console.error(`enum-атом ${a.id} без items`); fail++ }
    if (a.kind === 'bucket' && !a.bucket) { console.error(`bucket-атом ${a.id} без bucket`); fail++ }
    if (a.cloze && !a.cloze.includes('___')) { console.error(`атом ${a.id}: в cloze нет ___`); fail++ }
    groups.set(a.group, (groups.get(a.group) ?? 0) + 1)
  }

  // каждому атому нужен хотя бы один сосед по группе, иначе не собрать варианты ответа
  for (const a of island.atoms) {
    if ((groups.get(a.group) ?? 0) < 2 && a.kind !== 'enum' && !a.decoys?.length) {
      console.error(`атом ${a.id}: одинокая группа "${a.group}" и нет decoys, варианты ответа будут из чужой темы`)
      fail++
    }
  }
  console.log(`${f}: уроков ${island.lessons.length}, атомов ${island.atoms.length}, групп ${groups.size}`)
}

console.log(`\nвсего: уроков ${totalLessons}, атомов ${totalAtoms}`)
if (fail) { console.error(`\nпроблем: ${fail}`); process.exit(1) }
console.log('контент в порядке')
