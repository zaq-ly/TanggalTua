import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-110',
  secondary: 'bg-surface-2 text-ink hover:bg-line',
  danger: 'bg-surface-2 text-expense hover:bg-line',
  ghost: 'text-accent hover:bg-accent-soft',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  block?: boolean
}

export function Button({ variant = 'primary', block = false, className = '', type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-5 font-semibold transition',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        block ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    />
  )
}
