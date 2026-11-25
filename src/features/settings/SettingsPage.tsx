import { Link } from 'react-router'
import { ArrowLeft, SlidersHorizontal } from 'lucide-react'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'

export function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Pengaturan"
        action={
          <Link
            to="/"
            aria-label="Kembali ke Beranda"
            className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </Link>
        }
      />
      <EmptyState
        icon={SlidersHorizontal}
        title="Pengaturan belum tersedia"
        description="Tema, ekspor, dan impor data akan diatur dari halaman ini."
      />
    </>
  )
}
