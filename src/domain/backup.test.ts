import { describe, expect, it } from 'vitest'
import type { BudgetPot, Category, Wallet } from '../db/types'
import { UTF8_BOM } from '../lib/csv'
import { makeTransaction } from '../test/freshDb'
import { BACKUP_APP_ID, backupCounts, buildBackup, parseBackup, type BackupData } from './backup'
import { CSV_HEADER, transactionsCsv } from './csvExport'

const wallet: Wallet = { id: 'w1', name: 'MyBCA', icon: 'landmark', color: 'blue', startBalance: 1_000_000, archived: false, sort: 0 }
const tunai: Wallet = { id: 'w2', name: 'Tunai', icon: 'wallet', color: 'green', startBalance: 0, archived: true, sort: 1 }
const makan: Category = { id: 'c1', kind: 'expense', name: 'Makanan', icon: 'utensils', color: 'orange', archived: false, sort: 0, budgetPotId: 'p1' }
const pot: BudgetPot = { id: 'p1', key: 'p1', budgetId: 'b1', name: 'Kebutuhan', icon: 'house', color: 'teal', amount: 500_000, sort: 0, manualUsed: 10 }

function sample(): BackupData {
  return {
    wallets: [tunai, wallet],
    categories: [makan],
    transactions: [
      makeTransaction({ id: 't2', walletId: 'w1', categoryId: 'c1', note: 'Nasi, "padang"' }),
      makeTransaction({ id: 't1', type: 'transfer', fromWalletId: 'w1', toWalletId: 'w2', amount: 50_000, date: '2026-11-24' }),
    ],
    budgets: [{ id: 'b1', month: '2026-11', totalFund: 2_000_000 }],
    budgetPots: [pot],
    settings: [{ id: 'main', theme: 'system', schemaVersion: 2, includeArchivedInTotal: false, lastBackupAt: 1_000 }],
  }
}

function fileOf(data: BackupData, schemaVersion = 2): string {
  return JSON.stringify(buildBackup(data, schemaVersion, new Date('2026-11-26T03:00:00Z')))
}

describe('buildBackup', () => {
  it('berisi penanda aplikasi, versi skema, waktu ekspor, dan data terurut per id', () => {
    const backup = buildBackup(sample(), 2, new Date('2026-11-26T03:00:00Z'))
    expect(backup).toMatchObject({ app: BACKUP_APP_ID, schemaVersion: 2, exportedAt: '2026-11-26T03:00:00.000Z' })
    expect(backup.data.wallets.map((w) => w.id)).toEqual(['w1', 'w2'])
    expect(backup.data.transactions.map((t) => t.id)).toEqual(['t1', 't2'])
    expect(backupCounts(backup.data)).toEqual({ wallets: 2, categories: 1, transactions: 2, budgets: 1, budgetPots: 1 })
  })
})

describe('parseBackup', () => {
  it('bolak-balik: hasil baca sama persis dengan yang ditulis', () => {
    const text = fileOf(sample())
    const result = parseBackup(text, 2)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.backup).toEqual(JSON.parse(text))
  })

  it('menolak versi skema yang tidak cocok, dengan pesan yang membedakan lebih baru dan lebih lama', () => {
    const older = parseBackup(fileOf(sample(), 1), 2)
    expect(older).toEqual({ ok: false, error: expect.stringMatching(/lebih lama \(skema 1, aplikasi ini skema 2\)/) })
    const newer = parseBackup(fileOf(sample(), 3), 2)
    expect(newer).toEqual({ ok: false, error: expect.stringMatching(/lebih baru.*Perbarui aplikasi/) })
  })

  it('menolak file yang bukan cadangan', () => {
    for (const text of ['bukan json', '[]', '{"app":"lain","schemaVersion":2,"data":{}}', '{}']) {
      expect(parseBackup(text, 2)).toEqual({ ok: false, error: expect.stringMatching(/bukan cadangan Keuangan Zaq/) })
    }
  })

  it('menolak data yang rusak', () => {
    const broken = (mutate: (d: BackupData & Record<string, unknown>) => void) => {
      const data = sample() as BackupData & Record<string, unknown>
      mutate(data)
      const result = parseBackup(fileOf(data), 2)
      return result.ok ? 'ok' : result.error
    }
    const withoutTransactions = buildBackup(sample(), 2, new Date()) as unknown as { data: Partial<BackupData> }
    delete withoutTransactions.data.transactions
    expect(parseBackup(JSON.stringify(withoutTransactions), 2)).toEqual({
      ok: false,
      error: expect.stringMatching(/Bagian transaksi tidak ada/),
    })
    expect(broken((d) => (d.wallets[0] = { ...wallet, startBalance: 1.5 }))).toMatch(/Data dompet ke-1 tidak valid/)
    expect(broken((d) => d.wallets.push({ ...wallet }))).toMatch(/dompet dengan id ganda/)
    expect(broken((d) => (d.transactions[0] = makeTransaction({ id: 't2', walletId: 'hilang', categoryId: 'c1' })))).toMatch(
      /Transaksi ke-2 tidak valid: pilih dompet/,
    )
    expect(broken((d) => (d.transactions[0] = makeTransaction({ id: 't2', walletId: 'w1', categoryId: 'c1', amount: 0 })))).toMatch(
      /Transaksi ke-2 tidak valid/,
    )
    expect(broken((d) => (d.budgetPots[0] = { ...pot, budgetId: 'hilang' }))).toMatch(/pos anggaran tanpa anggaran/)
    expect(broken((d) => d.budgets.push({ id: 'b2', month: '2026-11', totalFund: 0 }))).toMatch(/dua anggaran untuk bulan yang sama/)
  })
})

describe('transactionsCsv', () => {
  it('hanya transaksi dalam periode, terbaru dulu, jumlah tanpa pemisah ribuan', () => {
    const data = sample()
    data.transactions.push(makeTransaction({ id: 't3', walletId: 'w1', categoryId: 'c1', date: '2026-10-31' }))
    const csv = transactionsCsv(data.transactions, data.wallets, data.categories, { start: '2026-11-01', end: '2026-11-30' })
    const lines = csv.slice(UTF8_BOM.length).trimEnd().split('\r\n')
    expect(lines).toEqual([
      CSV_HEADER.join(','),
      '2026-11-25,Pengeluaran,10000,Makanan,MyBCA,,"Nasi, ""padang"""',
      '2026-11-24,Transfer,50000,,MyBCA,Tunai,',
    ])
  })
})
