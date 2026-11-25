import { useLiveQuery } from 'dexie-react-hooks'
import { Settings, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '../../components/EmptyState'
import { EntityIcon } from '../../components/EntityIcon'
import { IconButtonLink } from '../../components/IconButtonLink'
import { PageHeader } from '../../components/PageHeader'
import { db } from '../../db/db'
import { bySort } from '../../domain/ordering'
import { formatRupiah } from '../../lib/money'

export function HomePage() {
  const wallets = useLiveQuery(() => db.wallets.toArray())
  const active = wallets?.filter((w) => !w.archived).sort(bySort)

  return (
    <>
      <PageHeader title="Beranda" action={<IconButtonLink to="/pengaturan" label="Pengaturan" icon={Settings} />} />

      {wallets?.length === 0 && (
        <EmptyState
          icon={Wallet}
          title="Belum ada dompet"
          description="Buat dompet pertama dan isi saldo awalnya untuk mulai mencatat."
          action={
            <Link to="/mulai" className="flex min-h-11 items-center rounded-control bg-accent px-5 font-semibold text-accent-ink">
              Buat dompet
            </Link>
          }
        />
      )}

      {active && wallets && wallets.length > 0 && (
        <section aria-labelledby="judul-dompet" className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 id="judul-dompet" className="font-semibold">
              Dompet
            </h2>
            <Link to="/pengaturan/dompet" className="flex min-h-11 items-center px-2 text-sm font-semibold text-accent">
              Kelola
            </Link>
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface">
            {active.map((w) => (
              <li key={w.id} className="flex min-h-16 items-center gap-3 px-3">
                <EntityIcon icon={w.icon} color={w.color} />
                <span className="min-w-0 flex-1 truncate font-medium">{w.name}</span>
                <span className="text-right">
                  <span className="block text-xs text-muted">Saldo awal</span>
                  <span className="block font-semibold tabular-nums">{formatRupiah(w.startBalance)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
