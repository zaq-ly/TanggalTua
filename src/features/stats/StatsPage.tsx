import { useLiveQuery } from 'dexie-react-hooks'
import { ChartPie, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { EmptyState } from '../../components/EmptyState'
import { EntityIcon } from '../../components/EntityIcon'
import { PageHeader } from '../../components/PageHeader'
import { PeriodPicker } from '../../components/PeriodPicker'
import { usePeriod } from '../../components/usePeriod'
import { db } from '../../db/db'
import type { CategoryKind } from '../../db/types'
import { formatPercentTenths } from '../../domain/budget'
import { budgetMonth, periodLabel, periodRange } from '../../domain/period'
import { categoryTotals, monthlyTotals, toSlices } from '../../domain/stats'
import { addMonths, monthRange } from '../../lib/date'
import { formatRupiah } from '../../lib/money'
import { CategoryDonut } from './CategoryDonut'
import { sliceColor } from './sliceColor'
import { MonthlyBars } from './MonthlyBars'

const MONTHS_IN_BARS = 6

const TABS: readonly { kind: CategoryKind; label: string }[] = [
  { kind: 'expense', label: 'Pengeluaran' },
  { kind: 'income', label: 'Pemasukan' },
]

export function StatsPage() {
  const period = usePeriod((s) => s.period)
  const [kind, setKind] = useState<CategoryKind>('expense')
  const range = periodRange(period)
  const endMonth = budgetMonth(period)
  // Cukup ambil transaksi dari awal grafik batang sampai akhir periode.
  const fetchStart = [range.start, monthRange(addMonths(endMonth, -(MONTHS_IN_BARS - 1))).start].sort()[0] ?? range.start
  const fetchEnd = [range.end, monthRange(endMonth).end].sort().at(-1) ?? range.end

  const data = useLiveQuery(async () => {
    const [transactions, categories] = await Promise.all([
      db.transactions.where('date').between(fetchStart, fetchEnd, true, true).toArray(),
      db.categories.toArray(),
    ])
    return { transactions, categories }
  }, [fetchStart, fetchEnd])

  const header = (
    <>
      <PageHeader title="Statistik" />
      <PeriodPicker />
    </>
  )
  if (!data) return header

  const rows = categoryTotals(data.transactions, data.categories, kind, range)
  const total = rows.reduce((sum, r) => sum + r.total, 0)
  const slices = toSlices(rows)
  const kindLabel = kind === 'expense' ? 'pengeluaran' : 'pemasukan'
  const months = monthlyTotals(data.transactions, endMonth, MONTHS_IN_BARS)

  return (
    <>
      {header}

      <div role="tablist" aria-label="Jenis statistik" className="grid grid-cols-2 gap-1 rounded-control bg-surface-2 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.kind}
            type="button"
            role="tab"
            aria-selected={tab.kind === kind}
            onClick={() => setKind(tab.kind)}
            className="min-h-10 rounded-[calc(var(--radius-control)-0.25rem)] font-semibold text-muted aria-selected:bg-surface aria-selected:text-ink aria-selected:shadow-sm"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section role="tabpanel" aria-label={`Statistik ${kindLabel} per kategori`} className="flex flex-col gap-4">
        {rows.length === 0 ? (
          <EmptyState
            icon={ChartPie}
            title={`Belum ada ${kindLabel} di periode ini`}
            description="Ganti periode di atas, atau catat transaksi dengan tombol +."
          />
        ) : (
          <>
            <div className="flex flex-col gap-4 rounded-card bg-surface px-4 py-4">
              <div>
                <p className="text-sm text-muted">Total {kindLabel} · {periodLabel(period)}</p>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">{formatRupiah(total)}</p>
              </div>
              <CategoryDonut slices={slices} total={total} totalLabel={`Total ${kindLabel}`} />
              {slices.length < rows.length && (
                <p className="flex items-center justify-center gap-1.5 text-sm text-muted">
                  <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: sliceColor({ color: null }) }} />
                  Kategori lain: {rows.length - slices.length + 1} kategori terkecil digabung
                </p>
              )}
            </div>

            <ul aria-label={`Rincian ${kindLabel} per kategori`} className="divide-y divide-line overflow-hidden rounded-card bg-surface">
              {rows.map((row) => {
                const name = row.category?.name ?? 'Kategori terhapus'
                return (
                  <li key={row.categoryId}>
                    <Link
                      to={`/riwayat?kategori=${row.categoryId}`}
                      aria-label={`${name}: ${formatRupiah(row.total)}, ${formatPercentTenths(row.shareTenths)}. Lihat transaksinya.`}
                      className="flex min-h-16 flex-col justify-center gap-1.5 px-3 py-2 hover:bg-surface-2"
                    >
                      <span className="flex items-center gap-3">
                        <EntityIcon icon={row.category?.icon ?? 'tag'} color={row.category?.color ?? 'slate'} size="sm" />
                        <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
                        <span className="text-right tabular-nums">
                          <span className="block font-semibold">{formatRupiah(row.total)}</span>
                          <span className="block text-xs text-muted">{formatPercentTenths(row.shareTenths)}</span>
                        </span>
                        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted" />
                      </span>
                      <span aria-hidden="true" className="ml-12 mr-7 block h-1 overflow-hidden rounded-full bg-surface-2">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${row.shareTenths / 10}%`, background: sliceColor({ color: row.category?.color ?? 'slate' }) }}
                        />
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      <section aria-labelledby="judul-bulanan" className="flex flex-col gap-3 rounded-card bg-surface px-4 py-4">
        <h2 id="judul-bulanan" className="font-semibold">
          {MONTHS_IN_BARS} bulan terakhir
        </h2>
        <MonthlyBars data={months} />
      </section>
    </>
  )
}
