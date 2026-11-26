import { describe, expect, it } from 'vitest'
import { setupFreshDb } from '../test/freshDb'
import { createCategory, setCategoryArchived } from './categories'
import type { KeuanganDB } from './schema'
import { addTransaction, deleteTransaction, restoreTransaction, updateTransaction } from './transactions'
import { createWallet } from './wallets'

const freshDb = setupFreshDb()

async function seed(database: KeuanganDB) {
  const bca = await createWallet({ name: 'MyBCA', icon: 'landmark', color: 'blue', startBalance: 1_000_000 }, database)
  const tunai = await createWallet({ name: 'Tunai', icon: 'wallet', color: 'green', startBalance: 0 }, database)
  const kopi = await createCategory('expense', { name: 'Kopi', icon: 'coffee', color: 'amber' }, database)
  const gaji = await createCategory('income', { name: 'Gaji', icon: 'banknote', color: 'green' }, database)
  return { bca, tunai, kopi, gaji }
}

describe('addTransaction', () => {
  it('menyimpan pengeluaran dengan waktu dibuat dan diubah', async () => {
    const database = freshDb()
    const { bca, kopi } = await seed(database)
    const { id } = await addTransaction(
      { type: 'expense', amount: 25_000, date: '2026-11-25', walletId: bca, categoryId: kopi, note: ' Kopi susu ' },
      { now: 1_000 },
      database,
    )
    expect(await database.transactions.get(id)).toEqual({
      id,
      type: 'expense',
      amount: 25_000,
      date: '2026-11-25',
      walletId: bca,
      categoryId: kopi,
      note: 'Kopi susu',
      createdAt: 1_000,
      updatedAt: 1_000,
    })
  })

  it('menolak data tidak valid tanpa menyimpan apa pun', async () => {
    const database = freshDb()
    const { bca, gaji } = await seed(database)
    await expect(
      addTransaction({ type: 'expense', amount: 10_000, date: '2026-11-25', walletId: bca, categoryId: gaji }, {}, database),
    ).rejects.toThrow('Pilih kategori pengeluaran.')
    expect(await database.transactions.count()).toBe(0)
  })

  it('biaya admin transfer menjadi pengeluaran terpisah di kategori Biaya Admin', async () => {
    const database = freshDb()
    const { bca, tunai } = await seed(database)
    const result = await addTransaction(
      { type: 'transfer', amount: 500_000, date: '2026-11-25', fromWalletId: bca, toWalletId: tunai },
      { adminFee: 6_500, now: 2_000 },
      database,
    )
    const transfer = await database.transactions.get(result.id)
    expect(transfer).toMatchObject({ type: 'transfer', amount: 500_000, fromWalletId: bca, toWalletId: tunai })
    expect(transfer?.categoryId).toBeUndefined()

    const fee = result.feeId ? await database.transactions.get(result.feeId) : undefined
    expect(fee).toMatchObject({
      type: 'expense',
      amount: 6_500,
      date: '2026-11-25',
      walletId: bca,
      note: 'Biaya admin transfer ke Tunai',
    })
    const feeCategory = fee?.categoryId ? await database.categories.get(fee.categoryId) : undefined
    expect(feeCategory).toMatchObject({ name: 'Biaya Admin', kind: 'expense', archived: false })
  })

  it('kategori Biaya Admin dipakai ulang, dan dibuat baru bila yang lama diarsipkan', async () => {
    const database = freshDb()
    const { bca, tunai } = await seed(database)
    const transfer = { type: 'transfer', amount: 100_000, date: '2026-11-25', fromWalletId: bca, toWalletId: tunai } as const
    const first = await addTransaction(transfer, { adminFee: 2_500 }, database)
    const second = await addTransaction(transfer, { adminFee: 2_500 }, database)
    const feeCategoryOf = async (id?: string) => (id ? (await database.transactions.get(id))?.categoryId : undefined)
    const firstCategory = await feeCategoryOf(first.feeId)
    expect(await feeCategoryOf(second.feeId)).toBe(firstCategory)

    if (firstCategory) await setCategoryArchived(firstCategory, true, database)
    const third = await addTransaction(transfer, { adminFee: 2_500 }, database)
    expect(await feeCategoryOf(third.feeId)).not.toBe(firstCategory)
  })

  it('biaya admin 0 tidak membuat pengeluaran; biaya pecahan ditolak', async () => {
    const database = freshDb()
    const { bca, tunai } = await seed(database)
    const transfer = { type: 'transfer', amount: 100_000, date: '2026-11-25', fromWalletId: bca, toWalletId: tunai } as const
    const result = await addTransaction(transfer, { adminFee: 0 }, database)
    expect(result.feeId).toBeUndefined()
    await expect(addTransaction(transfer, { adminFee: 1.5 }, database)).rejects.toThrow(/Biaya admin/)
    expect(await database.transactions.count()).toBe(1)
  })
})

describe('updateTransaction', () => {
  it('mengubah jumlah dan tanggal, menjaga waktu dibuat', async () => {
    const database = freshDb()
    const { bca, kopi } = await seed(database)
    const { id } = await addTransaction(
      { type: 'expense', amount: 25_000, date: '2026-11-25', walletId: bca, categoryId: kopi },
      { now: 1_000 },
      database,
    )
    await updateTransaction(
      id,
      { type: 'expense', amount: 30_000, date: '2026-11-20', walletId: bca, categoryId: kopi },
      { now: 5_000 },
      database,
    )
    expect(await database.transactions.get(id)).toMatchObject({
      amount: 30_000,
      date: '2026-11-20',
      createdAt: 1_000,
      updatedAt: 5_000,
    })
  })

  it('mengubah pengeluaran menjadi transfer membuang kategori dan dompet lama', async () => {
    const database = freshDb()
    const { bca, tunai, kopi } = await seed(database)
    const { id } = await addTransaction(
      { type: 'expense', amount: 25_000, date: '2026-11-25', walletId: bca, categoryId: kopi },
      {},
      database,
    )
    await updateTransaction(
      id,
      { type: 'transfer', amount: 25_000, date: '2026-11-25', fromWalletId: bca, toWalletId: tunai, categoryId: kopi, walletId: bca },
      {},
      database,
    )
    const updated = await database.transactions.get(id)
    expect(updated?.categoryId).toBeUndefined()
    expect(updated?.walletId).toBeUndefined()
    expect(updated).toMatchObject({ type: 'transfer', fromWalletId: bca, toWalletId: tunai })
  })

  it('menolak transaksi yang tidak ada', async () => {
    const database = freshDb()
    const { bca, kopi } = await seed(database)
    await expect(
      updateTransaction('hilang', { type: 'expense', amount: 1, date: '2026-11-25', walletId: bca, categoryId: kopi }, {}, database),
    ).rejects.toThrow(/tidak ditemukan/)
  })
})

describe('hapus dan undo', () => {
  it('memulihkan transaksi persis seperti sebelum dihapus', async () => {
    const database = freshDb()
    const { bca, kopi } = await seed(database)
    const { id } = await addTransaction(
      { type: 'expense', amount: 25_000, date: '2026-11-25', walletId: bca, categoryId: kopi, note: 'Kopi' },
      { now: 1_000 },
      database,
    )
    const before = await database.transactions.get(id)
    const deleted = await deleteTransaction(id, database)
    expect(await database.transactions.count()).toBe(0)
    await restoreTransaction(deleted, database)
    expect(await database.transactions.get(id)).toEqual(before)
  })

  it('menghapus transfer tidak menghapus biaya adminnya', async () => {
    const database = freshDb()
    const { bca, tunai } = await seed(database)
    const result = await addTransaction(
      { type: 'transfer', amount: 100_000, date: '2026-11-25', fromWalletId: bca, toWalletId: tunai },
      { adminFee: 2_500 },
      database,
    )
    await deleteTransaction(result.id, database)
    expect(await database.transactions.count()).toBe(1)
  })
})
