import { Link } from 'react-router'
import { Settings, Wallet } from 'lucide-react'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'

export function HomePage() {
  return (
    <>
      <PageHeader
        title="Beranda"
        action={
          <Link
            to="/pengaturan"
            aria-label="Pengaturan"
            className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
          >
            <Settings aria-hidden="true" className="size-5" />
          </Link>
        }
      />
      <EmptyState
        icon={Wallet}
        title="Belum ada dompet"
        description="Buat dompet pertama dan isi saldo awalnya untuk mulai mencatat."
      />
    </>
  )
}
