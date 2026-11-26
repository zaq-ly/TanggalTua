import { Dexie, type EntityTable } from 'dexie'
import type { Budget, BudgetPot, Category, Settings, Transaction, Wallet } from './types'

/**
 * Versi skema data. Naikkan bersama versi Dexie setiap kali skema berubah,
 * tulis migrasinya, dan perbarui tes. Nilai ini juga ikut di file ekspor.
 */
export const SCHEMA_VERSION = 2

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

    // v2: pos punya `key` tetap lintas bulan; Category.budgetPotId menyimpan key ini (bukan id pos per bulan),
    // supaya kaitan kategori cukup diatur sekali dan bulan lama tetap menghitung pemakaiannya.
    this.version(2)
      .stores({ budgetPots: 'id, budgetId, sort, key' })
      .upgrade(async (tx) => {
        await tx
          .table<BudgetPot, 'id'>('budgetPots')
          .toCollection()
          .modify((pot) => {
            pot.key ??= pot.id
          })
        // Kaitan lama menunjuk id pos; karena key awal = id, nilainya tetap benar tanpa diubah.
        await tx.table<Settings, 'main'>('settings').update('main', { schemaVersion: 2 })
      })

    this.on('populate', (tx) => {
      void tx.table<Settings, 'main'>('settings').add({ ...DEFAULT_SETTINGS })
    })
  }
}
