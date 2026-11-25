import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

interface IconButtonLinkProps {
  to: string
  label: string
  icon: LucideIcon
}

export function IconButtonLink({ to, label, icon: Icon }: IconButtonLinkProps) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
    >
      <Icon aria-hidden="true" className="size-5" />
    </Link>
  )
}
