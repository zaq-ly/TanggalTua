import { buildBackup, type Backup, type BackupData } from '../domain/backup'
import { db as defaultDb, getSettings } from './db'
import { SCHEMA_VERSION, type KeuanganDB } from './schema'

function allTables(database: KeuanganDB) {
  return [
    database.wallets,
    database.categories,
    database.transactions,
    database.budgets,
    database.budgetPots,
    database.settings,
  ]
}

async function readAll(database: KeuanganDB): Promise<BackupData> {
  const [wallets, categories, transactions, budgets, budgetPots, settings] = await Promise.all([
    database.wallets.toArray(),
    database.categories.toArray(),
    database.transactions.toArray(),
    database.budgets.toArray(),
    database.budgetPots.toArray(),
    database.settings.toArray(),
  ])
  return { wallets, categories, transactions, budgets, budgetPots, settings }
}

/**
 * Mencatat waktu cadangan lalu membaca semua tabel dalam satu transaksi, sehingga file
 * berisi `lastBackupAt` yang sama dengan database setelah ekspor.
 */
export async function exportBackup(now: Date = new Date(), database: KeuanganDB = defaultDb): Promise<Backup> {
  return database.transaction('rw', allTables(database), async () => {
    const settings = await getSettings(database)
    await database.settings.put({ ...settings, lastBackupAt: now.getTime() })
    return buildBackup(await readAll(database), SCHEMA_VERSION, now)
  })
}

/**
 * Mengganti semua data dengan isi cadangan (AGENTS.md aturan 9: hasilnya identik).
 * `backup` harus sudah lolos `parseBackup`; konfirmasi pengguna diurus di UI.
 */
export async function replaceWithBackup(backup: Backup, database: KeuanganDB = defaultDb): Promise<void> {
  await database.transaction('rw', allTables(database), async () => {
    await Promise.all(allTables(database).map((table) => table.clear()))
    const d = backup.data
    await database.wallets.bulkAdd(d.wallets)
    await database.categories.bulkAdd(d.categories)
    await database.transactions.bulkAdd(d.transactions)
    await database.budgets.bulkAdd(d.budgets)
    await database.budgetPots.bulkAdd(d.budgetPots)
    await database.settings.bulkAdd(d.settings)
  })
}

export async function currentData(database: KeuanganDB = defaultDb): Promise<BackupData> {
  return readAll(database)
}
