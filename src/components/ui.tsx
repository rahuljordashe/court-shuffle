import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils'

type Variant = 'signal' | 'ink' | 'outline' | 'ghost'

const variantClasses: Record<Variant, string> = {
  signal:
    'border border-signal bg-signal text-on-signal hover:border-signal-deep hover:bg-signal-deep',
  ink: 'border border-ink bg-ink text-paper hover:opacity-90',
  outline: 'border border-rule bg-raised text-ink hover:border-ink',
  ghost: 'border border-transparent bg-transparent text-ink-soft hover:bg-sunk',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export function Button({ variant = 'signal', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-4',
        'text-sm font-extrabold uppercase tracking-[0.09em] transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-45',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-md border border-rule bg-raised', className)} {...props} />
}

export function SectionLabel({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        'text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink-soft',
        className,
      )}
      {...props}
    />
  )
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'min-h-12 rounded-md border border-rule bg-raised px-3 text-base text-ink',
        'placeholder:text-ink-faint focus:border-ink focus:outline-none',
        className,
      )}
      {...props}
    />
  )
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'min-h-12 rounded-md border border-rule bg-raised px-2.5 text-sm font-bold text-ink',
        'focus:border-ink focus:outline-none',
        className,
      )}
      {...props}
    />
  )
}
