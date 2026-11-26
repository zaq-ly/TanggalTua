import type { Category, Transaction, Wallet } from '../db/types'
import { toCsv } from '../lib/csv'
import { inPeriod, type DateRange } from './period'
import { byNewest } from './transactions'

const TYPE_LABELS = { expense: 'Pengeluaran', income: 'Pemasukan', transfer: 'Transfer' } as const

export const CSV_HEADER = ['Tanggal', 'Jenis', 'Jumlah', 'Kategori', 'Dompet', 'Dompet tujuan', 'Catatan'] as const

/**
 * CSV transaksi dalam periode, terbaru dulu. Jumlah ditulis sebagai bilangan bulat tanpa
 * pemisah ribuan supaya langsung terbaca sebagai angka di spreadsheet. Untuk transfer,
 * "Dompet" adalah dompet asal.
 */
export function transactionsCsv(
  transactions: readonly Transaction[],
  wallets: readonly Wallet[],
  categories: readonly Category[],
  range: DateRange,
): string {
  const walletName = new Map(wallets.map((w) => [w.id, w.name]))
  const categoryName = new Map(categories.map((c) => [c.id, c.name]))
  const name = (map: Map<string, string>, id: string | undefined) => (id ? (map.get(id) ?? '') : '')
  const rows = transactions
    .filter((tx) => inPeriod(tx, range))
    .sort(byNewest)
    .map((tx) => [
      tx.date,
      TYPE_LABELS[tx.type],
      tx.amount,
      name(categoryName, tx.categoryId),
      name(walletName, tx.type === 'transfer' ? tx.fromWalletId : tx.walletId),
      name(walletName, tx.toWalletId),
      tx.note ?? '',
    ])
  return toCsv(CSV_HEADER, rows)
}
