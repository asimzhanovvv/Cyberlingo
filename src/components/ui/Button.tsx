import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'accent' | 'success' | 'danger' | 'ghost' | 'surface' | 'violet'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary [--press-edge:var(--primary-deep)]',
  accent: 'bg-accent text-on-accent [--press-edge:var(--accent-deep)]',
  success: 'bg-success text-on-primary [--press-edge:var(--success-deep)]',
  danger: 'bg-danger text-on-primary [--press-edge:var(--danger-deep)]',
  violet: 'bg-violet text-on-primary [--press-edge:var(--violet-deep)]',
  surface: 'bg-surface-2 text-text [--press-edge:var(--border)] border border-line',
  ghost: 'bg-transparent text-muted hover:text-text shadow-none',
}

const sizes: Record<Size, string> = {
  sm: 'h-10 px-4 text-sm rounded-xl',
  md: 'h-12 px-5 text-[15px] rounded-2xl',
  lg: 'h-14 px-6 text-base rounded-2xl',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  full?: boolean
  icon?: ReactNode
}

export function Button({ variant = 'primary', size = 'md', full, icon, className, children, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 font-display font-extrabold uppercase tracking-wide',
        'disabled:opacity-45 disabled:shadow-none active:disabled:translate-y-0',
        variant !== 'ghost' && 'press-3d',
        variants[variant],
        sizes[size],
        full && 'w-full',
        className,
      )}
    >
      {icon}
      {children}
    </button>
  )
}
