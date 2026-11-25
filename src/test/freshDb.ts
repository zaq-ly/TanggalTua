import { afterEach } from 'vitest'
import { KeuanganDB } from '../db/schema'
import type { Transaction } from '../db/types'

/** Database IndexedDB tiruan yang terpisah per tes dan dihapus otomatis setelahnya. */
export function setupFreshDb(): () => KeuanganDB {
  const opened: KeuanganDB[] = []
  afterEach(async () => {
    await Promise.all(opened.splice(0).map((database) => database.delete()))
  })
  return () => {
    const database = new KeuanganDB(`tes-${crypto.randomUUID()}`)
    opened.push(database)
    return database
  }
}

export function makeTransaction(overrides: Partial<Transaction> & Pick<Transaction, 'id'>): Transaction {
  return {
    type: 'expense',
    amount: 10_000,
    date: '2026-11-25',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}
