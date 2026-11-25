import { Dexie, type EntityTable } from 'dexie'
import type { Budget, BudgetPot, Category, Settings, Transaction, Wallet } from './types'

/**
 * Versi skema data. Naikkan bersama versi Dexie setiap kali skema berubah,
 * tulis migrasinya, dan perbarui tes. Nilai ini juga ikut di file ekspor.
 */
export const SCHEMA_VERSION = 1

export const DEFAULT_SETTINGS: Settings = {
  id: 'main',
  theme: 'system',
  schemaVersion: SCHEMA_VERSION,
  includeArchivedInTotal: false,
}

export class KeuanganDB extends Dexie {
  wallets!: EntityTable<Wallet, 'id'>
  categories!: EntityTable<Category, 'id'>
  transactions!: EntityTable<Transaction, 'id'>
  budgets!: EntityTable<Budget, 'id'>
  budgetPots!: EntityTable<BudgetPot, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor(name = 'keuangan-zaq') {
    super(name)

    // Boolean (`archived`) sengaja tidak diindeks: IndexedDB tidak menerima boolean sebagai kunci.
    this.version(1).stores({
      wallets: 'id, sort',
      categories: 'id, kind, sort, budgetPotId',
      transactions: 'id, date, type, categoryId, walletId, fromWalletId, toWalletId, createdAt',
      budgets: 'id, &month',
      budgetPots: 'id, budgetId, sort',
      settings: 'id',
    })

    this.on('populate', (tx) => {
      void tx.table<Settings, 'main'>('settings').add({ ...DEFAULT_SETTINGS })
    })
  }
}
