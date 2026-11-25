import { afterEach, describe, expect, it } from 'vitest'
import { getSettings } from './db'
import { DEFAULT_SETTINGS, KeuanganDB, SCHEMA_VERSION } from './schema'
import type { Transaction } from './types'

const openDbs: KeuanganDB[] = []

function freshDb(): KeuanganDB {
  const database = new KeuanganDB(`tes-${crypto.randomUUID()}`)
  openDbs.push(database)
  return database
}

afterEach(async () => {
  await Promise.all(openDbs.splice(0).map((database) => database.delete()))
})

describe('skema Dexie', () => {
  it('versi Dexie sama dengan SCHEMA_VERSION', async () => {
    const database = freshDb()
    await database.open()
    expect(database.verno).toBe(SCHEMA_VERSION)
  })

  it('membuat semua tabel yang ada di PRD', async () => {
    const database = freshDb()
    await database.open()
    expect(database.tables.map((t) => t.name).sort()).toEqual([
      'budgetPots',
      'budgets',
      'categories',
      'settings',
      'transactions',
      'wallets',
    ])
  })

  it('mengisi pengaturan bawaan saat database pertama dibuat', async () => {
    const database = freshDb()
    expect(await getSettings(database)).toEqual(DEFAULT_SETTINGS)
    expect(await database.settings.count()).toBe(1)
  })

  it('menolak dua anggaran untuk bulan yang sama', async () => {
    const database = freshDb()
    await database.budgets.add({ id: 'a', month: '2026-11', totalFund: 2_000_000 })
    await expect(database.budgets.add({ id: 'b', month: '2026-11', totalFund: 1_000_000 })).rejects.toThrow()
  })

  it('mencari transaksi berdasarkan rentang tanggal', async () => {
    const database = freshDb()
    const base: Omit<Transaction, 'id' | 'date'> = {
      type: 'expense',
      amount: 10_000,
      walletId: 'w',
      categoryId: 'c',
      createdAt: 0,
      updatedAt: 0,
    }
    await database.transactions.bulkAdd([
      { ...base, id: '1', date: '2026-10-31' },
      { ...base, id: '2', date: '2026-11-01' },
      { ...base, id: '3', date: '2026-11-30' },
      { ...base, id: '4', date: '2026-12-01' },
    ])
    const inNovember = await database.transactions
      .where('date')
      .between('2026-11-01', '2026-11-30', true, true)
      .toArray()
    expect(inNovember.map((t) => t.id)).toEqual(['2', '3'])
  })
})
