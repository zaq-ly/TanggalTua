import { describe, expect, it } from 'vitest'
import { makeTransaction, setupFreshDb } from '../test/freshDb'
import {
  createCategory,
  deleteCategory,
  ensureDefaultCategories,
  isCategoryUsed,
  reorderCategories,
  setCategoryArchived,
  updateCategory,
} from './categories'
import { UserFacingError } from './errors'
import { completeOnboarding } from './onboarding'
import {
  createWallet,
  deleteWallet,
  isWalletUsed,
  reorderWallets,
  setWalletArchived,
  updateWallet,
  type WalletInput,
} from './wallets'

const freshDb = setupFreshDb()

const bca: WalletInput = { name: 'MyBCA', icon: 'landmark', color: 'blue', startBalance: 1_500_000 }
const tunai: WalletInput = { name: 'Tunai', icon: 'wallet', color: 'green', startBalance: 200_000 }

describe('dompet', () => {
  it('membuat dompet dengan nama yang dirapikan dan urutan berikutnya', async () => {
    const database = freshDb()
    const a = await createWallet({ ...bca, name: '  MyBCA ' }, database)
    const b = await createWallet(tunai, database)
    const wallets = await database.wallets.orderBy('sort').toArray()
    expect(wallets.map((w) => [w.id, w.name, w.sort, w.archived])).toEqual([
      [a, 'MyBCA', 0, false],
      [b, 'Tunai', 1, false],
    ])
    expect(wallets[0]?.startBalance).toBe(1_500_000)
  })

  it('menolak nama kembar, saldo negatif, dan saldo pecahan', async () => {
    const database = freshDb()
    await createWallet(bca, database)
    await expect(createWallet({ ...tunai, name: 'mybca' }, database)).rejects.toThrow(UserFacingError)
    await expect(createWallet({ ...tunai, startBalance: -1 }, database)).rejects.toThrow(/negatif/)
    await expect(createWallet({ ...tunai, startBalance: 10.5 }, database)).rejects.toThrow(/desimal/)
    expect(await database.wallets.count()).toBe(1)
  })

  it('mengedit tanpa menganggap nama sendiri sebagai kembar', async () => {
    const database = freshDb()
    const id = await createWallet(bca, database)
    await updateWallet(id, { ...bca, color: 'teal', startBalance: 0 }, database)
    expect(await database.wallets.get(id)).toMatchObject({ name: 'MyBCA', color: 'teal', startBalance: 0 })
  })

  it('dompet yang dipakai transaksi, termasuk transfer, tidak bisa dihapus', async () => {
    const database = freshDb()
    const a = await createWallet(bca, database)
    const b = await createWallet(tunai, database)
    await database.transactions.add(makeTransaction({ id: 't', type: 'transfer', fromWalletId: a, toWalletId: b }))
    expect(await isWalletUsed(a, database)).toBe(true)
    expect(await isWalletUsed(b, database)).toBe(true)
    await expect(deleteWallet(b, database)).rejects.toThrow(/Arsipkan/)
    expect(await database.wallets.count()).toBe(2)
  })

  it('dompet yang belum dipakai bisa dihapus', async () => {
    const database = freshDb()
    const id = await createWallet(bca, database)
    await deleteWallet(id, database)
    expect(await database.wallets.count()).toBe(0)
  })

  it('mengarsipkan, lalu menolak pemulihan bila namanya sudah dipakai dompet aktif', async () => {
    const database = freshDb()
    const oldId = await createWallet(bca, database)
    await setWalletArchived(oldId, true, database)
    const newId = await createWallet(bca, database)
    await expect(setWalletArchived(oldId, false, database)).rejects.toThrow(/Ubah nama/)
    await updateWallet(newId, { ...bca, name: 'MyBCA Baru' }, database)
    await setWalletArchived(oldId, false, database)
    expect((await database.wallets.get(oldId))?.archived).toBe(false)
  })

  it('mengurutkan ulang', async () => {
    const database = freshDb()
    const a = await createWallet(bca, database)
    const b = await createWallet(tunai, database)
    await reorderWallets([b, a], database)
    expect((await database.wallets.orderBy('sort').toArray()).map((w) => w.id)).toEqual([b, a])
  })
})

describe('kategori', () => {
  it('nama kembar hanya ditolak dalam jenis yang sama', async () => {
    const database = freshDb()
    await createCategory('expense', { name: 'Lainnya', icon: 'ellipsis', color: 'slate' }, database)
    await createCategory('income', { name: 'Lainnya', icon: 'ellipsis', color: 'slate' }, database)
    await expect(
      createCategory('expense', { name: 'lainnya', icon: 'ellipsis', color: 'slate' }, database),
    ).rejects.toThrow(/Sudah ada kategori/)
  })

  it('urutan dihitung per jenis', async () => {
    const database = freshDb()
    await createCategory('expense', { name: 'A', icon: 'tag', color: 'blue' }, database)
    const income = await createCategory('income', { name: 'B', icon: 'tag', color: 'blue' }, database)
    expect((await database.categories.get(income))?.sort).toBe(0)
  })

  it('kategori terpakai hanya bisa diarsipkan', async () => {
    const database = freshDb()
    const id = await createCategory('expense', { name: 'Kopi', icon: 'coffee', color: 'amber' }, database)
    await database.transactions.add(makeTransaction({ id: 't', walletId: 'w', categoryId: id }))
    expect(await isCategoryUsed(id, database)).toBe(true)
    await expect(deleteCategory(id, database)).rejects.toThrow(/Arsipkan/)
    await setCategoryArchived(id, true, database)
    expect((await database.categories.get(id))?.archived).toBe(true)
  })

  it('mengedit dan mengurutkan ulang', async () => {
    const database = freshDb()
    const a = await createCategory('expense', { name: 'A', icon: 'tag', color: 'blue' }, database)
    const b = await createCategory('expense', { name: 'B', icon: 'tag', color: 'blue' }, database)
    await updateCategory(a, { name: 'Makan siang', icon: 'utensils', color: 'orange' }, database)
    await reorderCategories([b, a], database)
    const sorted = await database.categories.orderBy('sort').toArray()
    expect(sorted.map((c) => c.name)).toEqual(['B', 'Makan siang'])
  })

  it('kategori bawaan hanya diisi sekali', async () => {
    const database = freshDb()
    expect(await ensureDefaultCategories(database)).toBe(16)
    expect(await ensureDefaultCategories(database)).toBe(0)
    expect(await database.categories.count()).toBe(16)
  })

  it('kategori bawaan tidak diisi bila pengguna sudah punya kategori sendiri', async () => {
    const database = freshDb()
    await createCategory('expense', { name: 'Kopi', icon: 'coffee', color: 'amber' }, database)
    expect(await ensureDefaultCategories(database)).toBe(0)
  })
})

describe('onboarding', () => {
  it('menyimpan dompet berurutan beserta kategori bawaan', async () => {
    const database = freshDb()
    await completeOnboarding([bca, tunai], undefined, database)
    const wallets = await database.wallets.orderBy('sort').toArray()
    expect(wallets.map((w) => [w.name, w.startBalance, w.sort])).toEqual([
      ['MyBCA', 1_500_000, 0],
      ['Tunai', 200_000, 1],
    ])
    expect(await database.categories.count()).toBe(16)
  })

  it('tidak menyimpan apa pun bila satu dompet tidak valid', async () => {
    const database = freshDb()
    await expect(completeOnboarding([bca, { ...tunai, name: 'MyBCA' }], undefined, database)).rejects.toThrow(/Sudah ada/)
    expect(await database.wallets.count()).toBe(0)
    expect(await database.categories.count()).toBe(0)
  })

  it('menolak daftar kosong', async () => {
    await expect(completeOnboarding([], undefined, freshDb())).rejects.toThrow(/minimal satu/)
  })
})

describe('onboarding dengan anggaran', () => {
  it('menyimpan total dana dan template 50/30/20 bulan itu', async () => {
    const database = freshDb()
    await completeOnboarding([bca], { month: '2026-11', totalFund: 2_000_000, template: '50-30-20' }, database)
    const budget = await database.budgets.where('month').equals('2026-11').first()
    expect(budget?.totalFund).toBe(2_000_000)
    const pots = budget ? await database.budgetPots.where('budgetId').equals(budget.id).sortBy('sort') : []
    expect(pots.map((p) => [p.name, p.amount])).toEqual([
      ['Kebutuhan', 1_000_000],
      ['Keinginan', 600_000],
      ['Tabungan', 400_000],
    ])
  })

  it('mulai kosong hanya menyimpan total dana; total 0 tidak membuat anggaran', async () => {
    const database = freshDb()
    await completeOnboarding([bca], { month: '2026-11', totalFund: 1_500_000, template: 'kosong' }, database)
    expect(await database.budgetPots.count()).toBe(0)
    expect((await database.budgets.toArray()).map((b) => b.totalFund)).toEqual([1_500_000])

    const other = freshDb()
    await completeOnboarding([bca], { month: '2026-11', totalFund: 0, template: '50-30-20' }, other)
    expect(await other.budgets.count()).toBe(0)
  })
})
