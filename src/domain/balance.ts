import type { Rupiah, Transaction, Wallet } from '../db/types'
import { assertRupiah } from '../lib/money'

/**
 * Saldo selalu dihitung dari saldo awal dan transaksi, tidak pernah disimpan (AGENTS.md aturan 2).
 * saldoDompet = startBalance + Σ pemasukan − Σ pengeluaran + Σ transfer masuk − Σ transfer keluar
 */
export function walletBalances(wallets: readonly Wallet[], transactions: readonly Transaction[]): Map<string, Rupiah> {
  const balances = new Map<string, Rupiah>(wallets.map((w) => [w.id, w.startBalance]))
  const add = (walletId: string | undefined, delta: Rupiah) => {
    if (walletId === undefined) return
    const current = balances.get(walletId)
    // Transaksi ke dompet yang tidak dikenal diabaikan, bukan membuat saldo baru.
    if (current !== undefined) balances.set(walletId, current + delta)
  }

  for (const tx of transactions) {
    assertRupiah(tx.amount)
    if (tx.type === 'income') add(tx.walletId, tx.amount)
    else if (tx.type === 'expense') add(tx.walletId, -tx.amount)
    else {
      add(tx.fromWalletId, -tx.amount)
      add(tx.toWalletId, tx.amount)
    }
  }
  for (const value of balances.values()) assertRupiah(value, 'Saldo')
  return balances
}

/** totalSaldo = Σ saldo dompet aktif, atau semua dompet bila `includeArchived`. */
export function totalBalance(
  wallets: readonly Wallet[],
  balances: ReadonlyMap<string, Rupiah>,
  includeArchived: boolean,
): Rupiah {
  let total = 0
  for (const wallet of wallets) {
    if (wallet.archived && !includeArchived) continue
    total += balances.get(wallet.id) ?? wallet.startBalance
  }
  assertRupiah(total, 'Total saldo')
  return total
}
