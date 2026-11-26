import { describe, expect, it } from 'vitest'
import { addTransaction, deleteTransaction, updateTransaction } from '../db/transactions'
import type { Transaction, Wallet } from '../db/types'
import { createWallet, setWalletArchived } from '../db/wallets'
import { createCategory } from '../db/categories'
import { makeTransaction, setupFreshDb } from '../test/freshDb'
import { totalBalance, walletBalances } from './balance'
import { summarize } from './period'

function wallet(id: string, startBalance: number, archived = false): Wallet {
  return { id, name: id, icon: 'wallet', color: 'blue', startBalance, archived, sort: 0 }
}

const bca = wallet('bca', 1_000_000)
const tunai = wallet('tunai', 200_000)

describe('walletBalances', () => {
  it('tanpa transaksi sama dengan saldo awal', () => {
    expect(walletBalances([bca, tunai], [])).toEqual(new Map([['bca', 1_000_000], ['tunai', 200_000]]))
  })

  it('pemasukan menambah, pengeluaran mengurangi', () => {
    const txs: Transaction[] = [
      makeTransaction({ id: '1', type: 'income', amount: 500_000, walletId: 'bca' }),
      makeTransaction({ id: '2', type: 'expense', amount: 25_000, walletId: 'bca' }),
      makeTransaction({ id: '3', type: 'expense', amount: 10_000, walletId: 'tunai' }),
    ]
    const balances = walletBalances([bca, tunai], txs)
    expect(balances.get('bca')).toBe(1_475_000)
    expect(balances.get('tunai')).toBe(190_000)
  })

  it('transfer memindahkan saldo tanpa mengubah total', () => {
    const txs = [makeTransaction({ id: '1', type: 'transfer', amount: 300_000, fromWalletId: 'bca', toWalletId: 'tunai' })]
    const balances = walletBalances([bca, tunai], txs)
    expect(balances.get('bca')).toBe(700_000)
    expect(balances.get('tunai')).toBe(500_000)
    expect(totalBalance([bca, tunai], balances, false)).toBe(1_200_000)
  })

  it('transfer dengan biaya admin hanya mengurangi total sebesar biaya', () => {
    const txs = [
      makeTransaction({ id: '1', type: 'transfer', amount: 300_000, fromWalletId: 'bca', toWalletId: 'tunai' }),
      makeTransaction({ id: '2', type: 'expense', amount: 6_500, walletId: 'bca' }),
    ]
    expect(totalBalance([bca, tunai], walletBalances([bca, tunai], txs), false)).toBe(1_200_000 - 6_500)
  })

  it('saldo boleh minus bila pengeluaran melebihi isi dompet', () => {
    const txs = [makeTransaction({ id: '1', type: 'expense', amount: 250_000, walletId: 'tunai' })]
    expect(walletBalances([tunai], txs).get('tunai')).toBe(-50_000)
  })

  it('mengabaikan transaksi ke dompet yang tidak dikenal', () => {
    const txs = [makeTransaction({ id: '1', type: 'expense', amount: 1, walletId: 'hilang' })]
    expect(walletBalances([bca], txs)).toEqual(new Map([['bca', 1_000_000]]))
  })

  it('menolak jumlah pecahan', () => {
    const txs = [makeTransaction({ id: '1', type: 'expense', amount: 0.5, walletId: 'bca' })]
    expect(() => walletBalances([bca], txs)).toThrow(TypeError)
  })
})

describe('totalBalance dan dompet diarsipkan', () => {
  const lama = wallet('lama', 50_000, true)

  it('dompet diarsipkan tidak dihitung secara bawaan', () => {
    const balances = walletBalances([bca, tunai, lama], [])
    expect(totalBalance([bca, tunai, lama], balances, false)).toBe(1_200_000)
  })

  it('dompet diarsipkan ikut dihitung bila diatur', () => {
    const balances = walletBalances([bca, tunai, lama], [])
    expect(totalBalance([bca, tunai, lama], balances, true)).toBe(1_250_000)
  })

  it('total sama dengan jumlah saldo semua dompet aktif', () => {
    const txs = [
      makeTransaction({ id: '1', type: 'income', amount: 3_000_000, walletId: 'bca' }),
      makeTransaction({ id: '2', type: 'transfer', amount: 100_000, fromWalletId: 'bca', toWalletId: 'lama' }),
      makeTransaction({ id: '3', type: 'expense', amount: 75_000, walletId: 'tunai' }),
    ]
    const wallets = [bca, tunai, lama]
    const balances = walletBalances(wallets, txs)
    const sumActive = wallets.filter((w) => !w.archived).reduce((sum, w) => sum + (balances.get(w.id) ?? 0), 0)
    expect(totalBalance(wallets, balances, false)).toBe(sumActive)
    expect(sumActive).toBe(1_000_000 + 3_000_000 - 100_000 + 200_000 - 75_000)
  })
})

describe('saldo dari database setelah transaksi diedit, dihapus, dan dompet diarsipkan', () => {
  const freshDb = setupFreshDb()

  it('mengikuti perubahan data', async () => {
    const database = freshDb()
    const a = await createWallet({ name: 'MyBCA', icon: 'landmark', color: 'blue', startBalance: 1_000_000 }, database)
    const b = await createWallet({ name: 'Tunai', icon: 'wallet', color: 'green', startBalance: 100_000 }, database)
    const makan = await createCategory('expense', { name: 'Makan', icon: 'utensils', color: 'orange' }, database)

    const balancesNow = async () => {
      const wallets = await database.wallets.toArray()
      const balances = walletBalances(wallets, await database.transactions.toArray())
      return { a: balances.get(a), b: balances.get(b), total: totalBalance(wallets, balances, false) }
    }

    const { id } = await addTransaction(
      { type: 'expense', amount: 50_000, date: '2026-11-20', walletId: a, categoryId: makan },
      {},
      database,
    )
    expect(await balancesNow()).toEqual({ a: 950_000, b: 100_000, total: 1_050_000 })

    // Diedit: jumlah dan dompet berubah.
    await updateTransaction(id, { type: 'expense', amount: 30_000, date: '2026-11-20', walletId: b, categoryId: makan }, {}, database)
    expect(await balancesNow()).toEqual({ a: 1_000_000, b: 70_000, total: 1_070_000 })

    // Transfer.
    await addTransaction({ type: 'transfer', amount: 200_000, date: '2026-11-21', fromWalletId: a, toWalletId: b }, {}, database)
    expect(await balancesNow()).toEqual({ a: 800_000, b: 270_000, total: 1_070_000 })

    // Dihapus.
    await deleteTransaction(id, database)
    expect(await balancesNow()).toEqual({ a: 800_000, b: 300_000, total: 1_100_000 })

    // Diarsipkan: saldonya tetap dihitung per dompet tetapi keluar dari total.
    await setWalletArchived(b, true, database)
    expect(await balancesNow()).toEqual({ a: 800_000, b: 300_000, total: 800_000 })
  })

  it('ringkasan periode ikut berubah saat tanggal transaksi diedit', async () => {
    const database = freshDb()
    const a = await createWallet({ name: 'MyBCA', icon: 'landmark', color: 'blue', startBalance: 0 }, database)
    const makan = await createCategory('expense', { name: 'Makan', icon: 'utensils', color: 'orange' }, database)
    const { id } = await addTransaction(
      { type: 'expense', amount: 40_000, date: '2026-11-20', walletId: a, categoryId: makan },
      {},
      database,
    )
    const november = { start: '2026-11-01', end: '2026-11-30' }
    expect(summarize(await database.transactions.toArray(), november).expense).toBe(40_000)
    await updateTransaction(id, { type: 'expense', amount: 40_000, date: '2026-10-31', walletId: a, categoryId: makan }, {}, database)
    expect(summarize(await database.transactions.toArray(), november).expense).toBe(0)
  })
})
