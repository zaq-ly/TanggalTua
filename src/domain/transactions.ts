import type { Category, DateString, Rupiah, Transaction, TransactionType, Wallet } from '../db/types'
import { isDateString } from '../lib/date'
import { MAX_RUPIAH, formatRupiah, isRupiah } from '../lib/money'

export const NOTE_MAX_LENGTH = 200
export const ADMIN_FEE_CATEGORY_NAME = 'Biaya Admin'

/** Isi form transaksi sebelum disimpan. Field yang tidak relevan untuk `type` diabaikan. */
export interface TransactionDraft {
  type: TransactionType
  amount: Rupiah
  date: DateString
  categoryId?: string
  walletId?: string
  fromWalletId?: string
  toWalletId?: string
  note?: string
}

export interface LookupContext {
  wallets: ReadonlyMap<string, Wallet>
  categories: ReadonlyMap<string, Category>
}

export function normalizeNote(note: string | undefined): string | undefined {
  const trimmed = note?.trim().replace(/\s+/g, ' ')
  return trimmed ? trimmed : undefined
}

export function validateAmount(amount: number, label = 'Jumlah'): string | null {
  if (!isRupiah(amount)) return `${label} harus angka rupiah tanpa desimal.`
  if (amount <= 0) return `Isi ${label.toLowerCase()} lebih dari Rp0.`
  if (amount > MAX_RUPIAH) return `${label} maksimal ${formatRupiah(MAX_RUPIAH)}.`
  return null
}

/** Aturan integritas PRD bagian 4. Mengembalikan pesan galat pertama, atau `null` bila sah. */
export function validateTransaction(draft: TransactionDraft, ctx: LookupContext): string | null {
  const amountError = validateAmount(draft.amount)
  if (amountError) return amountError
  if (!isDateString(draft.date)) return 'Tanggal tidak valid. Pilih tanggal dari kalender.'
  const note = normalizeNote(draft.note)
  if (note && note.length > NOTE_MAX_LENGTH) return `Catatan terlalu panjang. Maksimal ${NOTE_MAX_LENGTH} karakter.`

  if (draft.type === 'transfer') {
    if (!draft.fromWalletId || !ctx.wallets.has(draft.fromWalletId)) return 'Pilih dompet asal transfer.'
    if (!draft.toWalletId || !ctx.wallets.has(draft.toWalletId)) return 'Pilih dompet tujuan transfer.'
    if (draft.fromWalletId === draft.toWalletId) return 'Dompet asal dan tujuan harus berbeda.'
    return null
  }

  if (!draft.walletId || !ctx.wallets.has(draft.walletId)) return 'Pilih dompet.'
  const category = draft.categoryId ? ctx.categories.get(draft.categoryId) : undefined
  if (!category) return 'Pilih kategori.'
  if (category.kind !== draft.type) {
    return draft.type === 'expense' ? 'Pilih kategori pengeluaran.' : 'Pilih kategori pemasukan.'
  }
  return null
}

/** Membuang field yang tidak berlaku untuk jenisnya, supaya data tersimpan selalu bersih. */
export function toStored(
  draft: TransactionDraft,
  meta: { id: string; createdAt: number; updatedAt: number },
): Transaction {
  const base = {
    id: meta.id,
    type: draft.type,
    amount: draft.amount,
    date: draft.date,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
  }
  const note = normalizeNote(draft.note)
  const withNote = note ? { note } : {}
  if (draft.type === 'transfer') {
    return { ...base, fromWalletId: draft.fromWalletId, toWalletId: draft.toWalletId, ...withNote }
  }
  return { ...base, walletId: draft.walletId, categoryId: draft.categoryId, ...withNote }
}

export function toDraft(tx: Transaction): TransactionDraft {
  return {
    type: tx.type,
    amount: tx.amount,
    date: tx.date,
    categoryId: tx.categoryId,
    walletId: tx.walletId,
    fromWalletId: tx.fromWalletId,
    toWalletId: tx.toWalletId,
    note: tx.note,
  }
}

/** Terbaru dulu: tanggal menurun, lalu waktu dibuat menurun untuk tanggal yang sama. */
export function byNewest(a: Transaction, b: Transaction): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  return b.createdAt - a.createdAt
}

export interface DayGroup {
  date: DateString
  items: Transaction[]
  /** Pemasukan dikurangi pengeluaran pada hari itu. Transfer tidak dihitung. */
  net: Rupiah
}

/** `transactions` harus sudah terurut dengan `byNewest`. */
export function groupByDate(transactions: readonly Transaction[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const tx of transactions) {
    let group = groups.at(-1)
    if (!group || group.date !== tx.date) {
      group = { date: tx.date, items: [], net: 0 }
      groups.push(group)
    }
    group.items.push(tx)
    group.net += signedAmount(tx)
  }
  return groups
}

/** Arah uang untuk total pemasukan/pengeluaran. Transfer bernilai 0 (AGENTS.md aturan 3). */
export function signedAmount(tx: Transaction): Rupiah {
  if (tx.type === 'income') return tx.amount
  if (tx.type === 'expense') return -tx.amount
  return 0
}

export interface TransactionFilter {
  query: string
  walletId?: string
  categoryId?: string
}

export function matchesFilter(tx: Transaction, filter: TransactionFilter, ctx: LookupContext): boolean {
  if (filter.walletId && ![tx.walletId, tx.fromWalletId, tx.toWalletId].includes(filter.walletId)) return false
  if (filter.categoryId && tx.categoryId !== filter.categoryId) return false
  const q = filter.query.trim().toLocaleLowerCase('id')
  if (q === '') return true
  const categoryName = tx.categoryId ? (ctx.categories.get(tx.categoryId)?.name ?? '') : ''
  const haystack = `${tx.note ?? ''} ${categoryName}`.toLocaleLowerCase('id')
  return haystack.includes(q)
}

/** Dompet yang dipakai terakhir, sebagai pilihan awal form supaya tidak perlu ketukan tambahan. */
export function preferredWalletId(
  latest: readonly Transaction[],
  activeWallets: readonly Wallet[],
): string | undefined {
  const activeIds = new Set(activeWallets.map((w) => w.id))
  for (const tx of latest) {
    const id = tx.walletId ?? tx.fromWalletId
    if (id && activeIds.has(id)) return id
  }
  return activeWallets[0]?.id
}
