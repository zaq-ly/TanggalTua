import { normalizeName, validateName } from '../domain/names'
import { nextSort } from '../domain/ordering'
import { validateStartBalance } from '../domain/wallets'
import { newId } from '../lib/id'
import { applyTemplate, setTotalFund, type BudgetTemplate } from './budgets'
import { ensureDefaultCategories } from './categories'
import { db as defaultDb } from './db'
import { UserFacingError } from './errors'
import type { KeuanganDB } from './schema'
import type { MonthString, Rupiah, Wallet } from './types'
import type { WalletInput } from './wallets'

/** Langkah 3 onboarding yang opsional. */
export interface OnboardingBudget {
  month: MonthString
  totalFund: Rupiah
  template: BudgetTemplate
}

/**
 * Menyimpan dompet pilihan onboarding, kategori bawaan, dan anggaran awal (bila diisi) dalam
 * satu transaksi, supaya tidak ada keadaan setengah jadi bila aplikasi tertutup di tengah jalan.
 */
export async function completeOnboarding(
  inputs: readonly WalletInput[],
  budget?: OnboardingBudget,
  database: KeuanganDB = defaultDb,
): Promise<void> {
  if (inputs.length === 0) throw new UserFacingError('Pilih atau buat minimal satu dompet.')

  const tables = [database.wallets, database.categories, database.budgets, database.budgetPots]
  await database.transaction('rw', tables, async () => {
    const existing = await database.wallets.toArray()
    const takenNames = existing.filter((w) => !w.archived).map((w) => w.name)
    let sort = nextSort(existing)
    const wallets: Wallet[] = []

    for (const input of inputs) {
      const error = validateName(input.name, takenNames, 'dompet') ?? validateStartBalance(input.startBalance)
      if (error) throw new UserFacingError(error)
      const name = normalizeName(input.name)
      takenNames.push(name)
      wallets.push({
        id: newId(),
        name,
        icon: input.icon,
        color: input.color,
        startBalance: input.startBalance,
        archived: false,
        sort: sort++,
      })
    }

    await database.wallets.bulkAdd(wallets)
    await ensureDefaultCategories(database)

    if (budget && budget.totalFund > 0) {
      await setTotalFund(budget.month, budget.totalFund, database)
      await applyTemplate(budget.month, budget.template, database)
    }
  })
}
