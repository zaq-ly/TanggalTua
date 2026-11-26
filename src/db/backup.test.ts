import { describe, expect, it } from 'vitest'
import { parseBackup } from '../domain/backup'
import { setupFreshDb } from '../test/freshDb'
import { exportBackup, replaceWithBackup } from './backup'
import { createPot, setManualUsed, setPotCategories, setTotalFund } from './budgets'
import { getSettings } from './db'
import { completeOnboarding } from './onboarding'
import { SCHEMA_VERSION, type KeuanganDB } from './schema'
import { setIncludeArchivedInTotal } from './settings'
import { addTransaction } from './transactions'
import { setWalletArchived } from './wallets'

const freshDb = setupFreshDb()

async function seedEverything(database: KeuanganDB) {
  await completeOnboarding(
    [
      { name: 'MyBCA', icon: 'landmark', color: 'blue', startBalance: 1_500_000 },
      { name: 'Tunai', icon: 'wallet', color: 'green', startBalance: 200_000 },
      { name: 'Lama', icon: 'wallet', color: 'slate', startBalance: 5_000 },
    ],
    { month: '2026-10', totalFund: 2_000_000, template: '50-30-20' },
    database,
  )
  const [bca, tunai, lama] = await database.wallets.orderBy('sort').toArray()
  const categories = await database.categories.toArray()
  const makan = categories.find((c) => c.name === 'Makanan')
  const gaji = categories.find((c) => c.name === 'Gaji')
  if (!bca || !tunai || !lama || !makan || !gaji) throw new Error('data contoh tidak lengkap')

  await addTransaction({ type: 'income', amount: 3_000_000, date: '2026-11-01', walletId: bca.id, categoryId: gaji.id, note: 'Gaji "November", ✓' }, {}, database)
  await addTransaction({ type: 'expense', amount: 25_000, date: '2026-11-20', walletId: tunai.id, categoryId: makan.id }, {}, database)
  await addTransaction(
    { type: 'transfer', amount: 500_000, date: '2026-11-21', fromWalletId: bca.id, toWalletId: tunai.id },
    { adminFee: 6_500 },
    database,
  )
  await setWalletArchived(lama.id, true, database)
  await setIncludeArchivedInTotal(true, database)
  await setTotalFund('2026-11', 2_500_000, database)
  const pot = await createPot('2026-11', { name: 'Makan', icon: 'utensils', color: 'orange', amount: 800_000 }, database)
  await setPotCategories(pot, [makan.id], database)
  const tabungan = await createPot('2026-11', { name: 'Dana darurat', icon: 'umbrella', color: 'indigo', amount: 300_000 }, database)
  await setManualUsed(tabungan, 300_000, database)
}

async function snapshot(database: KeuanganDB) {
  const byId = <T extends { id: string }>(rows: T[]) => rows.sort((a, b) => (a.id < b.id ? -1 : 1))
  return {
    wallets: byId(await database.wallets.toArray()),
    categories: byId(await database.categories.toArray()),
    transactions: byId(await database.transactions.toArray()),
    budgets: byId(await database.budgets.toArray()),
    budgetPots: byId(await database.budgetPots.toArray()),
    settings: byId(await database.settings.toArray()),
  }
}

describe('ekspor dan impor', () => {
  it('ekspor lalu impor ke database kosong menghasilkan data yang identik', async () => {
    const source = freshDb()
    await seedEverything(source)
    const backup = await exportBackup(new Date('2026-11-26T03:00:00Z'), source)
    const before = await snapshot(source)

    // Lewat teks JSON, persis seperti file yang diunduh lalu dipilih lagi.
    const parsed = parseBackup(JSON.stringify(backup), SCHEMA_VERSION)
    if (!parsed.ok) throw new Error(parsed.error)

    const target = freshDb()
    await target.open()
    await replaceWithBackup(parsed.backup, target)
    expect(await snapshot(target)).toEqual(before)
    expect(before.transactions).toHaveLength(4)
    expect(before.budgetPots.length).toBeGreaterThan(3)
  })

  it('ekspor kedua dari hasil impor sama dengan ekspor pertama', async () => {
    const source = freshDb()
    await seedEverything(source)
    const when = new Date('2026-11-26T03:00:00Z')
    const first = await exportBackup(when, source)
    const target = freshDb()
    await replaceWithBackup(first, target)
    expect(await exportBackup(when, target)).toEqual(first)
  })

  it('ekspor mencatat tanggal cadangan terakhir, dan nilai itu ikut di file', async () => {
    const database = freshDb()
    await seedEverything(database)
    const when = new Date('2026-11-26T03:00:00Z')
    const backup = await exportBackup(when, database)
    expect((await getSettings(database)).lastBackupAt).toBe(when.getTime())
    expect(backup.data.settings[0]?.lastBackupAt).toBe(when.getTime())
    expect(backup.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('impor mengganti semua data lama', async () => {
    const source = freshDb()
    await completeOnboarding([{ name: 'Satu-satunya', icon: 'wallet', color: 'blue', startBalance: 1 }], undefined, source)
    const small = await exportBackup(new Date(), source)

    const target = freshDb()
    await seedEverything(target)
    await replaceWithBackup(small, target)
    expect((await target.wallets.toArray()).map((w) => w.name)).toEqual(['Satu-satunya'])
    expect(await target.transactions.count()).toBe(0)
    expect(await target.budgets.count()).toBe(0)
  })
})
