import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarX, ReceiptText, Search, SearchX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { PeriodPicker } from '../../components/PeriodPicker'
import { usePeriod } from '../../components/usePeriod'
import { db } from '../../db/db'
import { bySort } from '../../domain/ordering'
import { inPeriod, periodRange } from '../../domain/period'
import { byNewest, groupByDate, matchesFilter, type TransactionFilter } from '../../domain/transactions'
import { relativeDayLabel } from '../../lib/date'
import { formatRupiah } from '../../lib/money'
import { TransactionRow } from './TransactionRow'
import { useAddSheet } from './useAddSheet'

/** Jumlah transaksi per muatan (keputusan pemilik: muat bertahap, tanpa virtualisasi). */
export const HISTORY_PAGE_SIZE = 100

const selectClass =
  'min-h-11 w-full min-w-0 rounded-control border border-line bg-surface px-3 text-sm font-medium text-ink'

export function HistoryPage() {
  const openEdit = useAddSheet((s) => s.openEdit)
  const [params] = useSearchParams()
  const period = usePeriod((s) => s.period)
  const range = periodRange(period)
  const rangeKey = `${range.start}/${range.end}`
  // Filter bisa datang dari kartu dompet di Beranda (?dompet=id) atau dari Statistik (?kategori=id).
  const [filter, setFilter] = useState<TransactionFilter>(() => ({
    query: '',
    walletId: params.get('dompet') ?? undefined,
    categoryId: params.get('kategori') ?? undefined,
  }))
  // Jumlah yang ditampilkan kembali ke satu muatan setiap periode berganti.
  const [paging, setPaging] = useState({ key: rangeKey, count: HISTORY_PAGE_SIZE })
  const visibleCount = paging.key === rangeKey ? paging.count : HISTORY_PAGE_SIZE
  const setVisibleCount = (update: (n: number) => number) =>
    setPaging((p) => ({ key: rangeKey, count: update(p.key === rangeKey ? p.count : HISTORY_PAGE_SIZE) }))
  const sentinelRef = useRef<HTMLDivElement>(null)

  const data = useLiveQuery(async () => {
    const [transactions, wallets, categories] = await Promise.all([
      db.transactions.toArray(),
      db.wallets.toArray(),
      db.categories.toArray(),
    ])
    return {
      transactions: transactions.sort(byNewest),
      wallets: wallets.sort(bySort),
      categories: categories.sort(bySort),
    }
  })

  const ctx = data && {
    wallets: new Map(data.wallets.map((w) => [w.id, w])),
    categories: new Map(data.categories.map((c) => [c.id, c])),
  }
  const filtered =
    data && ctx ? data.transactions.filter((tx) => inPeriod(tx, range) && matchesFilter(tx, filter, ctx)) : []
  const hasMore = filtered.length > visibleCount
  const groups = groupByDate(filtered.slice(0, visibleCount))
  const isFiltering = filter.query.trim() !== '' || filter.walletId !== undefined || filter.categoryId !== undefined

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!hasMore || !sentinel || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        setPaging((p) => ({ key: rangeKey, count: (p.key === rangeKey ? p.count : HISTORY_PAGE_SIZE) + HISTORY_PAGE_SIZE }))
      },
      { rootMargin: '600px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, visibleCount, rangeKey])

  function changeFilter(patch: Partial<TransactionFilter>) {
    setFilter((f) => ({ ...f, ...patch }))
    setVisibleCount(() => HISTORY_PAGE_SIZE)
  }

  if (!data || !ctx) return <PageHeader title="Riwayat" />

  if (data.transactions.length === 0) {
    return (
      <>
        <PageHeader title="Riwayat" />
        <EmptyState
          icon={ReceiptText}
          title="Belum ada transaksi"
          description="Ketuk tombol + di bawah untuk mencatat transaksi pertama."
        />
      </>
    )
  }

  const expenseCategories = data.categories.filter((c) => c.kind === 'expense')
  const incomeCategories = data.categories.filter((c) => c.kind === 'income')

  return (
    <>
      <PageHeader title="Riwayat" />

      <section aria-label="Cari dan saring" className="flex flex-col gap-2">
        <PeriodPicker />
        <label className="relative block">
          <span className="sr-only">Cari catatan atau kategori</span>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={filter.query}
            onChange={(e) => changeFilter({ query: e.target.value })}
            placeholder="Cari catatan atau kategori"
            className="min-h-12 w-full rounded-control border border-line bg-surface pr-4 pl-11 text-base"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <select
            aria-label="Saring dompet"
            value={filter.walletId ?? ''}
            onChange={(e) => changeFilter({ walletId: e.target.value || undefined })}
            className={selectClass}
          >
            <option value="">Semua dompet</option>
            {data.wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.archived ? `${w.name} (diarsipkan)` : w.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Saring kategori"
            value={filter.categoryId ?? ''}
            onChange={(e) => changeFilter({ categoryId: e.target.value || undefined })}
            className={selectClass}
          >
            <option value="">Semua kategori</option>
            <optgroup label="Pengeluaran">
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.archived ? `${c.name} (diarsipkan)` : c.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Pemasukan">
              {incomeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.archived ? `${c.name} (diarsipkan)` : c.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        {isFiltering && (
          <div className="flex items-center justify-between gap-2 text-sm text-muted">
            <span aria-live="polite">{filtered.length} transaksi cocok</span>
            <button
              type="button"
              onClick={() => changeFilter({ query: '', walletId: undefined, categoryId: undefined })}
              className="min-h-11 px-2 font-semibold text-accent"
            >
              Hapus filter
            </button>
          </div>
        )}
      </section>

      {filtered.length === 0 ? (
        isFiltering ? (
          <EmptyState
            icon={SearchX}
            title="Tidak ada transaksi yang cocok"
            description="Coba kata lain, ganti periode, atau hapus filter dompet dan kategori."
          />
        ) : (
          <EmptyState
            icon={CalendarX}
            title="Tidak ada transaksi di periode ini"
            description="Ganti periode di atas, atau ketuk tombol + untuk mencatat transaksi baru."
          />
        )
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <section key={group.date} aria-label={relativeDayLabel(group.date)}>
              <h2 className="flex items-baseline justify-between px-1 pb-1.5 text-sm">
                <span className="font-semibold">{relativeDayLabel(group.date)}</span>
                {group.net !== 0 && (
                  <span className={`tabular-nums ${group.net > 0 ? 'text-income' : 'text-muted'}`}>
                    {group.net > 0 ? '+' : ''}
                    {formatRupiah(group.net)}
                  </span>
                )}
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface">
                {group.items.map((tx) => (
                  <li key={tx.id}>
                    <TransactionRow tx={tx} wallets={ctx.wallets} categories={ctx.categories} onOpen={openEdit} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center">
              <Button variant="secondary" onClick={() => setVisibleCount((n) => n + HISTORY_PAGE_SIZE)}>
                Muat {Math.min(HISTORY_PAGE_SIZE, filtered.length - visibleCount)} transaksi lagi
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
