import { TEMPLATE_50_30_20, copyPots, potsFromTemplate, validateFund } from '../domain/budget'
import { normalizeName, validateName } from '../domain/names'
import { nextSort } from '../domain/ordering'
import { isMonthString } from '../lib/date'
import { newId } from '../lib/id'
import { db as defaultDb } from './db'
import { UserFacingError } from './errors'
import type { KeuanganDB } from './schema'
import type { Budget, BudgetPot, MonthString, Rupiah } from './types'

export interface PotInput {
  name: string
  icon: string
  color: string
  amount: Rupiah
}

export type BudgetTemplate = '50-30-20' | 'kosong'

function assertMonth(month: MonthString): void {
  if (!isMonthString(month)) throw new UserFacingError(`Bulan "${month}" tidak valid.`)
}

function assertFund(value: number, label: string): void {
  const error = validateFund(value, label)
  if (error) throw new UserFacingError(error)
}

async function budgetFor(month: MonthString, database: KeuanganDB): Promise<Budget | undefined> {
  return database.budgets.where('month').equals(month).first()
}

/** Anggaran bulan itu; dibuat dengan total dana 0 bila belum ada. */
async function ensureBudget(month: MonthString, database: KeuanganDB): Promise<Budget> {
  assertMonth(month)
  const existing = await budgetFor(month, database)
  if (existing) return existing
  const budget: Budget = { id: newId(), month, totalFund: 0 }
  await database.budgets.add(budget)
  return budget
}

export async function setTotalFund(month: MonthString, totalFund: Rupiah, database: KeuanganDB = defaultDb): Promise<void> {
  assertFund(totalFund, 'Total dana')
  await database.transaction('rw', database.budgets, async () => {
    const budget = await ensureBudget(month, database)
    // Nominal pos sengaja tidak diubah; persennya yang menyesuaikan (keputusan pemilik).
    await database.budgets.update(budget.id, { totalFund })
  })
}

async function assertPotName(name: string, budgetId: string, excludeId: string | undefined, database: KeuanganDB) {
  const others = (await database.budgetPots.where('budgetId').equals(budgetId).toArray())
    .filter((p) => p.id !== excludeId)
    .map((p) => p.name)
  const error = validateName(name, others, 'pos')
  if (error) throw new UserFacingError(error)
}

export async function createPot(month: MonthString, input: PotInput, database: KeuanganDB = defaultDb): Promise<string> {
  assertFund(input.amount, 'Jatah pos')
  return database.transaction('rw', database.budgets, database.budgetPots, async () => {
    const budget = await ensureBudget(month, database)
    await assertPotName(input.name, budget.id, undefined, database)
    const id = newId()
    await database.budgetPots.add({
      id,
      key: id,
      budgetId: budget.id,
      name: normalizeName(input.name),
      icon: input.icon,
      color: input.color,
      amount: input.amount,
      sort: nextSort(await database.budgetPots.where('budgetId').equals(budget.id).toArray()),
    })
    return id
  })
}

export async function updatePot(id: string, input: PotInput, database: KeuanganDB = defaultDb): Promise<void> {
  assertFund(input.amount, 'Jatah pos')
  await database.transaction('rw', database.budgetPots, async () => {
    const pot = await database.budgetPots.get(id)
    if (!pot) throw new UserFacingError('Pos tidak ditemukan. Mungkin sudah dihapus.')
    await assertPotName(input.name, pot.budgetId, id, database)
    await database.budgetPots.update(id, {
      name: normalizeName(input.name),
      icon: input.icon,
      color: input.color,
      amount: input.amount,
    })
  })
}

/** `undefined` menghapus pemakaian manual. */
export async function setManualUsed(id: string, value: Rupiah | undefined, database: KeuanganDB = defaultDb): Promise<void> {
  if (value !== undefined) assertFund(value, 'Jumlah yang disisihkan')
  await database.transaction('rw', database.budgetPots, async () => {
    const pot = await database.budgetPots.get(id)
    if (!pot) throw new UserFacingError('Pos tidak ditemukan. Mungkin sudah dihapus.')
    const next: BudgetPot = { ...pot }
    if (value === undefined || value === 0) delete next.manualUsed
    else next.manualUsed = value
    await database.budgetPots.put(next)
  })
}

/**
 * Menghapus pos dari satu bulan. Kaitan kategori dilepas hanya bila key pos ini
 * tidak dipakai di bulan lain, supaya bulan lain tetap terhitung.
 */
export async function deletePot(id: string, database: KeuanganDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.budgetPots, database.categories, async () => {
    const pot = await database.budgetPots.get(id)
    if (!pot) return
    await database.budgetPots.delete(id)
    const stillUsed = (await database.budgetPots.where('key').equals(pot.key).count()) > 0
    if (!stillUsed) {
      await database.categories.where('budgetPotId').equals(pot.key).modify((c) => {
        delete c.budgetPotId
      })
    }
  })
}

/**
 * Menetapkan kategori pengeluaran yang terkait ke pos dengan `potKey`. Satu kategori hanya
 * bisa di satu pos, jadi kategori yang dipilih pindah dari pos lamanya.
 */
export async function setPotCategories(
  potKey: string,
  categoryIds: readonly string[],
  database: KeuanganDB = defaultDb,
): Promise<void> {
  const chosen = new Set(categoryIds)
  await database.transaction('rw', database.categories, async () => {
    const expenses = await database.categories.where('kind').equals('expense').toArray()
    if (categoryIds.some((id) => !expenses.some((c) => c.id === id))) {
      throw new UserFacingError('Hanya kategori pengeluaran yang bisa dikaitkan ke pos.')
    }
    for (const category of expenses) {
      if (chosen.has(category.id) && category.budgetPotId !== potKey) {
        await database.categories.update(category.id, { budgetPotId: potKey })
      } else if (!chosen.has(category.id) && category.budgetPotId === potKey) {
        await database.categories.where('id').equals(category.id).modify((c) => {
          delete c.budgetPotId
        })
      }
    }
  })
}

export interface SavePotRequest {
  /** Bulan anggaran untuk pos baru; diabaikan saat mengubah. */
  month: MonthString
  id?: string
  input: PotInput
  categoryIds: readonly string[]
  /** Hanya disimpan bila tidak ada kategori terkait (PRD F7). */
  manualUsed?: Rupiah
}

/** Form pos disimpan dalam satu transaksi: data pos, kaitan kategori, dan pemakaian manual. */
export async function savePot(request: SavePotRequest, database: KeuanganDB = defaultDb): Promise<string> {
  return database.transaction('rw', database.budgets, database.budgetPots, database.categories, async () => {
    const id = request.id ?? (await createPot(request.month, request.input, database))
    if (request.id) await updatePot(id, request.input, database)
    const pot = await database.budgetPots.get(id)
    if (!pot) throw new UserFacingError('Pos tidak ditemukan. Mungkin sudah dihapus.')
    await setPotCategories(pot.key, request.categoryIds, database)
    await setManualUsed(id, request.categoryIds.length > 0 ? undefined : request.manualUsed, database)
    return id
  })
}

/** Anggaran terakhir sebelum `month` yang punya pos, sebagai sumber "salin dari bulan lalu". */
export async function previousBudgetWithPots(
  month: MonthString,
  database: KeuanganDB = defaultDb,
): Promise<Budget | undefined> {
  const earlier = await database.budgets.where('month').below(month).reverse().toArray()
  for (const budget of earlier) {
    if ((await database.budgetPots.where('budgetId').equals(budget.id).count()) > 0) return budget
  }
  return undefined
}

async function assertNoPots(budget: Budget, database: KeuanganDB): Promise<void> {
  if ((await database.budgetPots.where('budgetId').equals(budget.id).count()) > 0) {
    throw new UserFacingError('Bulan ini sudah punya pos. Hapus pos yang ada dulu bila ingin memulai ulang.')
  }
}

/** Menyalin pos (dan total dana bila bulan ini belum diisi) dari anggaran terakhir sebelumnya. */
export async function copyFromPrevious(month: MonthString, database: KeuanganDB = defaultDb): Promise<number> {
  return database.transaction('rw', database.budgets, database.budgetPots, async () => {
    const source = await previousBudgetWithPots(month, database)
    if (!source) throw new UserFacingError('Belum ada anggaran bulan sebelumnya untuk disalin.')
    const budget = await ensureBudget(month, database)
    await assertNoPots(budget, database)
    if (budget.totalFund === 0) await database.budgets.update(budget.id, { totalFund: source.totalFund })
    const pots = copyPots(await database.budgetPots.where('budgetId').equals(source.id).toArray(), budget.id, newId)
    await database.budgetPots.bulkAdd(pots)
    return pots.length
  })
}

export async function applyTemplate(
  month: MonthString,
  template: BudgetTemplate,
  database: KeuanganDB = defaultDb,
): Promise<void> {
  await database.transaction('rw', database.budgets, database.budgetPots, async () => {
    const budget = await ensureBudget(month, database)
    await assertNoPots(budget, database)
    if (template === 'kosong') return
    await database.budgetPots.bulkAdd(potsFromTemplate(TEMPLATE_50_30_20, budget.id, budget.totalFund, newId))
  })
}

export async function reorderPots(orderedIds: readonly string[], database: KeuanganDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.budgetPots, async () => {
    await Promise.all(orderedIds.map((id, sort) => database.budgetPots.update(id, { sort })))
  })
}
