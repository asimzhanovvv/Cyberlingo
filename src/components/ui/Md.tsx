import { renderInline } from '@/lib/utils'

export function Md({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {renderInline(text).map((part, i) => {
        if (typeof part === 'string') return <span key={i}>{part}</span>
        if (part.b) return <strong key={i} className="font-semibold text-text">{part.b}</strong>
        if (part.c)
          return (
            <code key={i} className="rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-[0.9em] text-primary">
              {part.c}
            </code>
          )
        return <em key={i} className="italic">{part.i}</em>
      })}
    </span>
  )
}
