import clsx, { type ClassValue } from 'clsx'

export const cn = (...v: ClassValue[]) => clsx(v)

export const todayKey = () => new Date().toISOString().slice(0, 10)

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)
}

export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}

/** Минимальный инлайн-markdown: **жирный**, *курсив*, `код`. */
export function renderInline(text: string): (string | { b?: string; i?: string; c?: string })[] {
  const out: (string | { b?: string; i?: string; c?: string })[] = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith('**')) out.push({ b: tok.slice(2, -2) })
    else if (tok.startsWith('`')) out.push({ c: tok.slice(1, -1) })
    else out.push({ i: tok.slice(1, -1) })
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
