import type { ThemePreference } from '../lib/theme'
import { db as defaultDb, getSettings } from './db'
import { DEFAULT_SETTINGS, type KeuanganDB } from './schema'

export async function setIncludeArchivedInTotal(value: boolean, database: KeuanganDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.settings, async () => {
    const current = await getSettings(database)
    await database.settings.put({ ...current, includeArchivedInTotal: value })
  })
}

export async function setTheme(theme: ThemePreference, database: KeuanganDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.settings, async () => {
    const current = await getSettings(database)
    await database.settings.put({ ...current, theme })
  })
}

/**
 * Menghapus semua dompet, kategori, transaksi, dan anggaran, lalu mengembalikan pengaturan
 * bawaan. Tema dipertahankan supaya tampilan tidak tiba-tiba berganti.
 */
export async function wipeAllData(database: KeuanganDB = defaultDb): Promise<void> {
  const tables = [
    database.wallets,
    database.categories,
    database.transactions,
    database.budgets,
    database.budgetPots,
    database.settings,
  ]
  await database.transaction('rw', tables, async () => {
    const { theme } = await getSettings(database)
    await Promise.all(tables.map((table) => table.clear()))
    await database.settings.add({ ...DEFAULT_SETTINGS, theme })
  })
}
