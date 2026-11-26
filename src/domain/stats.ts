import type { Category, CategoryKind, MonthString, Rupiah, Transaction } from '../db/types'
import { addMonths, monthOf } from '../lib/date'
import { assertRupiah } from '../lib/money'
import type { DateRange } from './period'

export interface CategoryTotal {
  categoryId: string
  category: Category | undefined
  total: Rupiah
  /** Sepersepuluh persen (333 = 33,3%). Semua baris berjumlah tepat 1000. */
  shareTenths: number
}

/**
 * Membulatkan pembagian ke satu desimal dengan sisa terbesar, supaya jumlahnya tetap 100%
 * (PRD bagian 5). Mengembalikan sepersepuluh persen.
 */
export function shareTenths(values: readonly number[]): number[] {
  const sum = values.reduce((a, b) => a + b, 0)
  if (sum <= 0) return values.map(() => 0)
  const exact = values.map((v) => (v * 1000) / sum)
  const result = exact.map(Math.floor)
  let leftover = 1000 - result.reduce((a, b) => a + b, 0)
  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  for (const { index } of order) {
    if (leftover <= 0) break
    result[index] = (result[index] ?? 0) + 1
    leftover -= 1
  }
  return result
}

/** Total per kategori untuk satu jenis dalam rentang, terbesar dulu. Transfer tidak pernah ikut. */
export function categoryTotals(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  kind: CategoryKind,
  range: DateRange,
): CategoryTotal[] {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const totals = new Map<string, Rupiah>()
  for (const tx of transactions) {
    if (tx.type !== kind || !tx.categoryId) continue
    if (tx.date < range.start || tx.date > range.end) continue
    totals.set(tx.categoryId, (totals.get(tx.categoryId) ?? 0) + tx.amount)
  }
  const rows = [...totals.entries()]
    .map(([categoryId, total]) => {
      assertRupiah(total)
      return { categoryId, category: byId.get(categoryId), total }
    })
    .sort((a, b) => b.total - a.total || (a.category?.name ?? '').localeCompare(b.category?.name ?? '', 'id'))
  const shares = shareTenths(rows.map((r) => r.total))
  return rows.map((row, index) => ({ ...row, shareTenths: shares[index] ?? 0 }))
}

export const FOLDED_LABEL = 'Kategori lain'

export interface Slice {
  key: string
  label: string
  /** Kunci palet kategori, atau `null` untuk gabungan "Kategori lain". */
  color: string | null
  total: Rupiah
  shareTenths: number
}

/**
 * Donat dibatasi `maxSlices` potong supaya warna tetap bisa dibedakan; sisanya digabung
 * menjadi "Kategori lain". Daftar di bawah donat tetap menampilkan semua kategori.
 */
export function toSlices(rows: readonly CategoryTotal[], maxSlices = 6): Slice[] {
  const toSlice = (r: CategoryTotal): Slice => ({
    key: r.categoryId,
    label: r.category?.name ?? 'Tanpa kategori',
    color: r.category?.color ?? null,
    total: r.total,
    shareTenths: r.shareTenths,
  })
  if (rows.length <= maxSlices) return rows.map(toSlice)
  const head = rows.slice(0, maxSlices - 1).map(toSlice)
  const tail = rows.slice(maxSlices - 1)
  return [
    ...head,
    {
      key: 'kategori-lain',
      label: FOLDED_LABEL,
      color: null,
      total: tail.reduce((sum, r) => sum + r.total, 0),
      shareTenths: tail.reduce((sum, r) => sum + r.shareTenths, 0),
    },
  ]
}

export interface MonthTotals {
  month: MonthString
  income: Rupiah
  expense: Rupiah
}

/** Pemasukan dan pengeluaran per bulan, `count` bulan berakhir di `endMonth`, urut kronologis. */
export function monthlyTotals(transactions: readonly Transaction[], endMonth: MonthString, count = 6): MonthTotals[] {
  const months = Array.from({ length: count }, (_, i) => addMonths(endMonth, i - count + 1))
  const byMonth = new Map(months.map((month) => [month, { month, income: 0, expense: 0 }]))
  for (const tx of transactions) {
    if (tx.type === 'transfer') continue
    const bucket = byMonth.get(monthOf(tx.date))
    if (!bucket) continue
    if (tx.type === 'income') bucket.income += tx.amount
    else bucket.expense += tx.amount
  }
  return months.map((month) => {
    const totals = byMonth.get(month) ?? { month, income: 0, expense: 0 }
    assertRupiah(totals.income)
    assertRupiah(totals.expense)
    return totals
  })
}
