import { describe, expect, it } from 'vitest'
import { setupFreshDb } from '../test/freshDb'
import {
  applyTemplate,
  copyFromPrevious,
  createPot,
  deletePot,
  previousBudgetWithPots,
  setManualUsed,
  setPotCategories,
  setTotalFund,
  updatePot,
} from './budgets'
import { createCategory } from './categories'
import type { KeuanganDB } from './schema'

const freshDb = setupFreshDb()

const kebutuhan = { name: 'Kebutuhan', icon: 'house', color: 'teal', amount: 1_000_000 }

async function potsOf(database: KeuanganDB, month: string) {
  const budget = await database.budgets.where('month').equals(month).first()
  return budget ? (await database.budgetPots.where('budgetId').equals(budget.id).sortBy('sort')) : []
}

describe('total dana', () => {
  it('membuat anggaran bulan itu dan mengubahnya tanpa mengubah nominal pos', async () => {
    const database = freshDb()
    await setTotalFund('2026-11', 2_000_000, database)
    await createPot('2026-11', kebutuhan, database)
    await setTotalFund('2026-11', 3_000_000, database)
    expect(await database.budgets.where('month').equals('2026-11').first()).toMatchObject({ totalFund: 3_000_000 })
    expect((await potsOf(database, '2026-11'))[0]?.amount).toBe(1_000_000)
    expect(await database.budgets.count()).toBe(1)
  })

  it('menolak total negatif atau pecahan dan bulan tidak valid', async () => {
    const database = freshDb()
    await expect(setTotalFund('2026-11', -1, database)).rejects.toThrow(/negatif/)
    await expect(setTotalFund('2026-11', 0.5, database)).rejects.toThrow(/desimal/)
    await expect(setTotalFund('2026-13', 1, database)).rejects.toThrow(/tidak valid/)
  })
})

describe('pos', () => {
  it('membuat pos dengan key = id dan menolak nama kembar dalam bulan yang sama', async () => {
    const database = freshDb()
    const id = await createPot('2026-11', kebutuhan, database)
    expect(await database.budgetPots.get(id)).toMatchObject({ key: id, name: 'Kebutuhan', amount: 1_000_000, sort: 0 })
    await expect(createPot('2026-11', { ...kebutuhan, name: 'kebutuhan ' }, database)).rejects.toThrow(/Sudah ada pos/)
    await createPot('2026-12', kebutuhan, database)
  })

  it('mengubah pos', async () => {
    const database = freshDb()
    const id = await createPot('2026-11', kebutuhan, database)
    await updatePot(id, { ...kebutuhan, amount: 1_200_000, color: 'blue' }, database)
    expect(await database.budgetPots.get(id)).toMatchObject({ amount: 1_200_000, color: 'blue' })
  })

  it('pemakaian manual bisa diisi dan dikosongkan', async () => {
    const database = freshDb()
    const id = await createPot('2026-11', kebutuhan, database)
    await setManualUsed(id, 400_000, database)
    expect((await database.budgetPots.get(id))?.manualUsed).toBe(400_000)
    await setManualUsed(id, undefined, database)
    expect(await database.budgetPots.get(id)).not.toHaveProperty('manualUsed')
  })
})

describe('kaitan kategori', () => {
  it('satu kategori hanya di satu pos; memilih ulang memindahkannya', async () => {
    const database = freshDb()
    const makan = await createCategory('expense', { name: 'Makan', icon: 'utensils', color: 'orange' }, database)
    const kopi = await createCategory('expense', { name: 'Kopi', icon: 'coffee', color: 'amber' }, database)
    const a = await createPot('2026-11', kebutuhan, database)
    const b = await createPot('2026-11', { ...kebutuhan, name: 'Keinginan' }, database)

    await setPotCategories(a, [makan, kopi], database)
    expect((await database.categories.get(makan))?.budgetPotId).toBe(a)
    await setPotCategories(b, [kopi], database)
    expect((await database.categories.get(kopi))?.budgetPotId).toBe(b)
    expect((await database.categories.get(makan))?.budgetPotId).toBe(a)

    await setPotCategories(a, [], database)
    expect(await database.categories.get(makan)).not.toHaveProperty('budgetPotId')
  })

  it('menolak kategori pemasukan', async () => {
    const database = freshDb()
    const gaji = await createCategory('income', { name: 'Gaji', icon: 'banknote', color: 'green' }, database)
    const a = await createPot('2026-11', kebutuhan, database)
    await expect(setPotCategories(a, [gaji], database)).rejects.toThrow(/pengeluaran/)
  })

  it('menghapus pos hanya melepas kaitan bila key-nya tidak dipakai bulan lain', async () => {
    const database = freshDb()
    const makan = await createCategory('expense', { name: 'Makan', icon: 'utensils', color: 'orange' }, database)
    const nov = await createPot('2026-11', kebutuhan, database)
    await setPotCategories(nov, [makan], database)
    await copyFromPrevious('2026-12', database)
    const [des] = await potsOf(database, '2026-12')

    await deletePot(nov, database)
    expect((await database.categories.get(makan))?.budgetPotId).toBe(nov)
    if (des) await deletePot(des.id, database)
    expect(await database.categories.get(makan)).not.toHaveProperty('budgetPotId')
  })
})

describe('salin dari bulan lalu dan template', () => {
  it('menyalin pos dengan key yang sama dan total dana bila belum diisi', async () => {
    const database = freshDb()
    await setTotalFund('2026-10', 2_000_000, database)
    const nov = await createPot('2026-10', kebutuhan, database)
    await setManualUsed(nov, 500_000, database)
    // November dilewati: sumbernya anggaran terakhir yang punya pos.
    expect((await previousBudgetWithPots('2026-12', database))?.month).toBe('2026-10')

    expect(await copyFromPrevious('2026-12', database)).toBe(1)
    const [copied] = await potsOf(database, '2026-12')
    expect(copied).toMatchObject({ key: nov, name: 'Kebutuhan', amount: 1_000_000 })
    expect(copied).not.toHaveProperty('manualUsed')
    expect(copied?.id).not.toBe(nov)
    expect((await database.budgets.where('month').equals('2026-12').first())?.totalFund).toBe(2_000_000)
  })

  it('tidak menimpa total dana yang sudah diisi dan menolak bila sudah ada pos', async () => {
    const database = freshDb()
    await setTotalFund('2026-10', 2_000_000, database)
    await createPot('2026-10', kebutuhan, database)
    await setTotalFund('2026-11', 2_500_000, database)
    await copyFromPrevious('2026-11', database)
    expect((await database.budgets.where('month').equals('2026-11').first())?.totalFund).toBe(2_500_000)
    await expect(copyFromPrevious('2026-11', database)).rejects.toThrow(/sudah punya pos/)
  })

  it('menolak bila belum ada anggaran sebelumnya', async () => {
    await expect(copyFromPrevious('2026-11', freshDb())).rejects.toThrow(/Belum ada anggaran/)
  })

  it('template 50/30/20 membagi total dana bulan itu', async () => {
    const database = freshDb()
    await setTotalFund('2026-11', 2_000_001, database)
    await applyTemplate('2026-11', '50-30-20', database)
    const pots = await potsOf(database, '2026-11')
    expect(pots.map((p) => [p.name, p.amount])).toEqual([
      ['Kebutuhan', 1_000_001],
      ['Keinginan', 600_000],
      ['Tabungan', 400_000],
    ])
    await expect(applyTemplate('2026-11', '50-30-20', database)).rejects.toThrow(/sudah punya pos/)
  })
})
