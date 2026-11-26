import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '../../components/EmptyState'
import { IconButtonLink } from '../../components/IconButtonLink'
import { ManageList } from '../../components/ManageList'
import { PageHeader } from '../../components/PageHeader'
import { SwitchRow } from '../../components/SwitchRow'
import { db, getSettings } from '../../db/db'
import { setIncludeArchivedInTotal } from '../../db/settings'
import { reorderWallets, setWalletArchived } from '../../db/wallets'
import { walletBalances } from '../../domain/balance'
import { bySort } from '../../domain/ordering'
import { formatRupiah } from '../../lib/money'

export function WalletsPage() {
  const data = useLiveQuery(async () => {
    const [wallets, transactions, settings] = await Promise.all([
      db.wallets.toArray(),
      db.transactions.toArray(),
      getSettings(),
    ])
    return { wallets: wallets.sort(bySort), balances: walletBalances(wallets, transactions), settings }
  })
  const wallets = data?.wallets

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
      {data && wallets && wallets.length > 0 && (
        <>
          <ManageList
            noun="dompet"
            items={wallets.map((w) => ({
              ...w,
              subtitle: `Saldo ${formatRupiah(data.balances.get(w.id) ?? w.startBalance)}`,
            }))}
            editHref={(id) => `/pengaturan/dompet/${id}`}
            onReorder={(ids) => reorderWallets(ids)}
            onRestore={(id) => setWalletArchived(id, false)}
          />
          <SwitchRow
            label="Hitung dompet diarsipkan"
            description="Masukkan saldo dompet yang diarsipkan ke total saldo di Beranda."
            checked={data.settings.includeArchivedInTotal}
            onChange={(value) => void setIncludeArchivedInTotal(value)}
          />
        </>
      )}
    </>
  )
}
