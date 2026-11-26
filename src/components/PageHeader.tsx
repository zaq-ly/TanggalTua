import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useGoBack } from './useGoBack'

interface PageHeaderProps {
  title: string
  action?: ReactNode
  /** Tampilkan tombol kembali. Nilainya halaman induk, dipakai bila tidak ada riwayat. */
  backTo?: string
}

export function PageHeader({ title, action, backTo }: PageHeaderProps) {
  return (
    <header className="flex min-h-14 items-center justify-between gap-2 pt-[env(safe-area-inset-top)]">
      <div className="flex min-w-0 items-center gap-1">
        {backTo && <BackLink fallback={backTo} />}
        <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
      {action}
    </header>
  )
}

function BackLink({ fallback }: { fallback: string }) {
  const goBack = useGoBack(fallback)
  return (
    <Link
      to={fallback}
      onClick={(event) => {
        // Tautan tetap punya href (bisa dibuka di tab baru), tetapi ketukan biasa mengikuti riwayat.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
        event.preventDefault()
        goBack()
      }}
      aria-label="Kembali"
      className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
    >
      <ArrowLeft aria-hidden="true" className="size-5" />
    </Link>
  )
}
