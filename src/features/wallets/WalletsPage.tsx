import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '../../components/EmptyState'
import { IconButtonLink } from '../../components/IconButtonLink'
import { ManageList } from '../../components/ManageList'
import { PageHeader } from '../../components/PageHeader'
import { db } from '../../db/db'
import { reorderWallets, setWalletArchived } from '../../db/wallets'
import { bySort } from '../../domain/ordering'
import { formatRupiah } from '../../lib/money'

export function WalletsPage() {
  const wallets = useLiveQuery(() => db.wallets.toArray())

  return (
    <>
      <PageHeader
        title="Dompet"
        backTo="/pengaturan"
        backLabel="Kembali ke Pengaturan"
        action={<IconButtonLink to="/pengaturan/dompet/baru" label="Tambah dompet" icon={Plus} />}
      />
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
      {wallets && wallets.length > 0 && (
        <ManageList
          noun="dompet"
          items={[...wallets].sort(bySort).map((w) => ({ ...w, subtitle: `Saldo awal ${formatRupiah(w.startBalance)}` }))}
          editHref={(id) => `/pengaturan/dompet/${id}`}
          onReorder={(ids) => reorderWallets(ids)}
          onRestore={(id) => setWalletArchived(id, false)}
        />
      )}
    </>
  )
}
