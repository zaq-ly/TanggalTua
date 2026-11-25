import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

interface PageHeaderProps {
  title: string
  action?: ReactNode
  /** Tampilkan tombol kembali ke alamat ini. */
  backTo?: string
  backLabel?: string
}

export function PageHeader({ title, action, backTo, backLabel = 'Kembali' }: PageHeaderProps) {
  return (
    <header className="flex min-h-14 items-center justify-between gap-2 pt-[env(safe-area-inset-top)]">
      <div className="flex min-w-0 items-center gap-1">
        {backTo && (
          <Link
            to={backTo}
            aria-label={backLabel}
            className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </Link>
        )}
        <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
      {action}
    </header>
  )
}
