import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Settings, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '../../components/EmptyState'
import { EntityIcon } from '../../components/EntityIcon'
import { IconButtonLink } from '../../components/IconButtonLink'
import { PageHeader } from '../../components/PageHeader'
import { PeriodPicker } from '../../components/PeriodPicker'
import { usePeriod } from '../../components/usePeriod'
import { db, getSettings } from '../../db/db'
import { totalBalance, walletBalances } from '../../domain/balance'
import { bySort } from '../../domain/ordering'
import { periodRange, summarize } from '../../domain/period'
import { byNewest } from '../../domain/transactions'
import { formatRupiah } from '../../lib/money'
import { TransactionRow } from '../transactions/TransactionRow'
import { useAddSheet } from '../transactions/useAddSheet'

const RECENT_COUNT = 5

export function HomePage() {
  const period = usePeriod((s) => s.period)
  const openEdit = useAddSheet((s) => s.openEdit)
  const openAdd = useAddSheet((s) => s.open)

  const data = useLiveQuery(async () => {
    const [wallets, categories, transactions, settings] = await Promise.all([
      db.wallets.toArray(),
      db.categories.toArray(),
      db.transactions.toArray(),
      getSettings(),
    ])
    return { wallets: wallets.sort(bySort), categories, transactions, settings }
  })

  const header = <PageHeader title="Beranda" action={<IconButtonLink to="/pengaturan" label="Pengaturan" icon={Settings} />} />

  if (!data) return header

  if (data.wallets.length === 0) {
    return (
      <>
        {header}
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
      </>
    )
  }

  const includeArchived = data.settings.includeArchivedInTotal
  const balances = walletBalances(data.wallets, data.transactions)
  const total = totalBalance(data.wallets, balances, includeArchived)
  const active = data.wallets.filter((w) => !w.archived)
  const summary = summarize(data.transactions, periodRange(period))
  const recent = [...data.transactions].sort(byNewest).slice(0, RECENT_COUNT)
  const walletMap = new Map(data.wallets.map((w) => [w.id, w]))
  const categoryMap = new Map(data.categories.map((c) => [c.id, c]))

  return (
    <>
      {header}

      <section aria-labelledby="judul-total" className="rounded-card bg-accent px-5 py-5 text-accent-ink">
        <h2 id="judul-total" className="text-sm font-medium opacity-80">
          Total saldo
        </h2>
        <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{formatRupiah(total)}</p>
        <p className="mt-1 text-sm opacity-80">
          {active.length} dompet aktif{includeArchived && data.wallets.length > active.length ? ', termasuk yang diarsipkan' : ''}
        </p>
      </section>

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
          {active.map((w) => {
            const balance = balances.get(w.id) ?? w.startBalance
            return (
              <li key={w.id}>
                <Link
                  to={`/riwayat?dompet=${w.id}`}
                  aria-label={`${w.name}, saldo ${formatRupiah(balance)}. Lihat riwayat dompet ini.`}
                  className="flex min-h-16 items-center gap-3 px-3 hover:bg-surface-2"
                >
                  <EntityIcon icon={w.icon} color={w.color} />
                  <span className="min-w-0 flex-1 truncate font-medium">{w.name}</span>
                  <span className={`font-semibold tabular-nums ${balance < 0 ? 'text-expense' : ''}`}>{formatRupiah(balance)}</span>
                  <ChevronRight aria-hidden="true" className="size-4 text-muted" />
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-label="Ringkasan periode" className="flex flex-col gap-2">
        <PeriodPicker />
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-card bg-surface px-4 py-3">
            <p className="text-sm text-muted">Pemasukan</p>
            <p className="font-semibold text-income tabular-nums">{formatRupiah(summary.income)}</p>
          </div>
          <div className="rounded-card bg-surface px-4 py-3">
            <p className="text-sm text-muted">Pengeluaran</p>
            <p className="font-semibold text-expense tabular-nums">{formatRupiah(summary.expense)}</p>
          </div>
          <div className="col-span-2 flex items-center justify-between rounded-card bg-surface px-4 py-3">
            <p className="text-sm text-muted">Selisih</p>
            <p className={`font-semibold tabular-nums ${summary.net < 0 ? 'text-expense' : summary.net > 0 ? 'text-income' : ''}`}>
              {summary.net > 0 ? '+' : ''}
              {formatRupiah(summary.net)}
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="judul-terakhir" className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 id="judul-terakhir" className="font-semibold">
            Transaksi terakhir
          </h2>
          {recent.length > 0 && (
            <Link to="/riwayat" className="flex min-h-11 items-center px-2 text-sm font-semibold text-accent">
              Lihat semua
            </Link>
          )}
        </div>
        {recent.length > 0 ? (
          <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface">
            {recent.map((tx) => (
              <li key={tx.id}>
                <TransactionRow tx={tx} wallets={walletMap} categories={categoryMap} onOpen={openEdit} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line bg-surface px-6 py-6 text-center">
            <p className="text-sm text-muted">Belum ada transaksi. Catat pengeluaran atau pemasukan pertamamu.</p>
            <button
              type="button"
              onClick={openAdd}
              className="min-h-11 rounded-control bg-accent-soft px-5 font-semibold text-accent"
            >
              Catat transaksi
            </button>
          </div>
        )}
      </section>
    </>
  )
}
