import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode
  children: ReactNode
}

export function Chip({ icon, children, className = '', type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-medium hover:bg-surface-2 ${className}`}
      {...rest}
    >
      {icon}
      {children !== '' && <span className="truncate">{children}</span>}
    </button>
  )
}
