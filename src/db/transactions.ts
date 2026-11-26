import { validateName } from '../domain/names'
import { nextSort } from '../domain/ordering'
import {
  ADMIN_FEE_CATEGORY_NAME,
  toStored,
  validateAmount,
  validateTransaction,
  type LookupContext,
  type TransactionDraft,
} from '../domain/transactions'
import { newId } from '../lib/id'
import { db as defaultDb } from './db'
import { UserFacingError } from './errors'
import type { KeuanganDB } from './schema'
import type { Category, Rupiah, Transaction } from './types'

async function lookupContext(database: KeuanganDB): Promise<LookupContext> {
  const [wallets, categories] = await Promise.all([database.wallets.toArray(), database.categories.toArray()])
  return {
    wallets: new Map(wallets.map((w) => [w.id, w])),
    categories: new Map(categories.map((c) => [c.id, c])),
  }
}

async function assertValid(draft: TransactionDraft, database: KeuanganDB): Promise<LookupContext> {
  const ctx = await lookupContext(database)
  const error = validateTransaction(draft, ctx)
  if (error) throw new UserFacingError(error)
  return ctx
}

/** Kategori aktif "Biaya Admin"; dibuat bila belum ada (keputusan pemilik, lihat PRD F3). */
async function adminFeeCategoryId(database: KeuanganDB): Promise<string> {
  const expenses = await database.categories.where('kind').equals('expense').toArray()
  // validateName menolak nama yang sudah dipakai kategori aktif, termasuk beda huruf besar atau spasi.
  const existing = expenses.find((c) => !c.archived && validateName(ADMIN_FEE_CATEGORY_NAME, [c.name], 'kategori') !== null)
  if (existing) return existing.id
  const category: Category = {
    id: newId(),
    kind: 'expense',
    name: ADMIN_FEE_CATEGORY_NAME,
    icon: 'receipt',
    color: 'slate',
    archived: false,
    sort: nextSort(expenses),
  }
  await database.categories.add(category)
  return category.id
}

export interface AddResult {
  id: string
  feeId?: string
}

/**
 * Menyimpan transaksi baru. Untuk transfer, `adminFee` > 0 dicatat sebagai pengeluaran
 * mandiri dari dompet asal; setelah tersimpan ia tidak terikat ke transfernya.
 */
export async function addTransaction(
  draft: TransactionDraft,
  options: { adminFee?: Rupiah; now?: number } = {},
  database: KeuanganDB = defaultDb,
): Promise<AddResult> {
  const now = options.now ?? Date.now()
  const fee = draft.type === 'transfer' ? (options.adminFee ?? 0) : 0
  if (fee !== 0) {
    const feeError = validateAmount(fee, 'Biaya admin')
    if (feeError) throw new UserFacingError(feeError)
  }

  return database.transaction('rw', database.transactions, database.wallets, database.categories, async () => {
    const ctx = await assertValid(draft, database)
    const tx = toStored(draft, { id: newId(), createdAt: now, updatedAt: now })
    await database.transactions.add(tx)
    if (fee === 0) return { id: tx.id }

    const toName = draft.toWalletId ? ctx.wallets.get(draft.toWalletId)?.name : undefined
    const feeTx = toStored(
      {
        type: 'expense',
        amount: fee,
        date: draft.date,
        walletId: draft.fromWalletId,
        categoryId: await adminFeeCategoryId(database),
        note: toName ? `Biaya admin transfer ke ${toName}` : 'Biaya admin transfer',
      },
      // +1 supaya biaya tampil tepat di atas transfernya pada urutan terbaru.
      { id: newId(), createdAt: now + 1, updatedAt: now + 1 },
    )
    await database.transactions.add(feeTx)
    return { id: tx.id, feeId: feeTx.id }
  })
}

export async function updateTransaction(
  id: string,
  draft: TransactionDraft,
  options: { now?: number } = {},
  database: KeuanganDB = defaultDb,
): Promise<void> {
  await database.transaction('rw', database.transactions, database.wallets, database.categories, async () => {
    const existing = await database.transactions.get(id)
    if (!existing) throw new UserFacingError('Transaksi tidak ditemukan. Mungkin sudah dihapus.')
    await assertValid(draft, database)
    // put, bukan update, supaya field lama yang tidak berlaku (misalnya kategori saat diubah jadi transfer) terhapus.
    await database.transactions.put(
      toStored(draft, { id, createdAt: existing.createdAt, updatedAt: options.now ?? Date.now() }),
    )
  })
}

/** Mengembalikan transaksi yang dihapus supaya bisa dipulihkan lewat undo. */
export async function deleteTransaction(id: string, database: KeuanganDB = defaultDb): Promise<Transaction> {
  return database.transaction('rw', database.transactions, async () => {
    const existing = await database.transactions.get(id)
    if (!existing) throw new UserFacingError('Transaksi tidak ditemukan. Mungkin sudah dihapus.')
    await database.transactions.delete(id)
    return existing
  })
}

/** Undo hapus: menyimpan kembali persis seperti sebelumnya, termasuk id dan waktu dibuat. */
export async function restoreTransaction(tx: Transaction, database: KeuanganDB = defaultDb): Promise<void> {
  await database.transactions.put(tx)
}
