import type { BudgetPot, Category, Rupiah, Transaction } from '../db/types'
import { MAX_RUPIAH, assertRupiah, formatRupiah, isRupiah } from '../lib/money'
import type { ColorKey } from '../lib/palette'
import type { DateRange } from './period'

/** Ambang "hampir habis": sisa di bawah 20% jatah (PRD F7). */
export const LOW_REMAINING_PERCENT = 20

export function validateFund(value: number, label: string): string | null {
  if (!isRupiah(value)) return `${label} harus angka rupiah tanpa desimal.`
  if (value < 0) return `${label} tidak boleh negatif.`
  if (value > MAX_RUPIAH) return `${label} maksimal ${formatRupiah(MAX_RUPIAH)}.`
  return null
}

/**
 * Persen pos terhadap total dana dalam satuan sepersepuluh persen (333 = 33,3%), supaya
 * pembulatan satu desimal tetap bilangan bulat. `null` bila total dana 0.
 */
export function percentTenths(amount: Rupiah, totalFund: Rupiah): number | null {
  if (totalFund <= 0) return null
  return Math.round((amount * 1000) / totalFund)
}

/** `333` → `33,3%`, `500` → `50%`. */
export function formatPercentTenths(tenths: number): string {
  const whole = Math.trunc(tenths / 10)
  const fraction = Math.abs(tenths % 10)
  return fraction === 0 ? `${whole}%` : `${whole},${fraction}%`
}

/** Persen bulat 0–100 ke nominal, dibulatkan ke rupiah terdekat. */
export function amountFromPercent(percent: number, totalFund: Rupiah): Rupiah {
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new RangeError('Persen harus bilangan bulat 0 sampai 100.')
  }
  assertRupiah(totalFund, 'Total dana')
  return Math.round((totalFund * percent) / 100)
}

/**
 * Membagi total dana sesuai daftar persen. Bila persen berjumlah 100, hasilnya berjumlah
 * tepat sama dengan total dana: sisa pembulatan dibagikan ke pecahan terbesar dulu.
 */
export function splitByPercents(totalFund: Rupiah, percents: readonly number[]): Rupiah[] {
  assertRupiah(totalFund, 'Total dana')
  const exact = percents.map((p) => (totalFund * p) / 100)
  const amounts = exact.map(Math.floor)
  const sumPercent = percents.reduce((a, b) => a + b, 0)
  if (sumPercent !== 100) return exact.map(Math.round)

  let leftover = totalFund - amounts.reduce((a, b) => a + b, 0)
  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  for (const { index } of order) {
    if (leftover <= 0) break
    amounts[index] = (amounts[index] ?? 0) + 1
    leftover -= 1
  }
  return amounts
}

/** belumDialokasikan = totalFund − Σ amount pos. Negatif berarti pos melebihi total dana. */
export function unallocated(totalFund: Rupiah, pots: readonly Pick<BudgetPot, 'amount'>[]): Rupiah {
  const allocated = pots.reduce((sum, pot) => sum + pot.amount, 0)
  assertRupiah(allocated, 'Total pos')
  return totalFund - allocated
}

export type PotStatus = 'ok' | 'low' | 'over'

export interface PotUsage {
  used: Rupiah
  remaining: Rupiah
  status: PotStatus
  /** Kategori pengeluaran yang terkait ke pos ini. */
  linkedCategoryIds: string[]
}

/**
 * terpakaiPos = Σ pengeluaran kategori terkait dalam bulan anggaran + manualUsed.
 * sisaPos = amount − terpakaiPos.
 */
export function potUsage(
  pot: BudgetPot,
  categories: readonly Category[],
  transactions: readonly Transaction[],
  month: DateRange,
): PotUsage {
  const linkedCategoryIds = categories
    .filter((c) => c.kind === 'expense' && c.budgetPotId === pot.key)
    .map((c) => c.id)
  const linked = new Set(linkedCategoryIds)
  let used = pot.manualUsed ?? 0
  for (const tx of transactions) {
    if (tx.type !== 'expense' || !tx.categoryId || !linked.has(tx.categoryId)) continue
    if (tx.date < month.start || tx.date > month.end) continue
    used += tx.amount
  }
  assertRupiah(used, 'Terpakai')
  const remaining = pot.amount - used
  return { used, remaining, status: potStatus(pot.amount, remaining), linkedCategoryIds }
}

export function potStatus(amount: Rupiah, remaining: Rupiah): PotStatus {
  if (remaining < 0) return 'over'
  // remaining * 100 < amount * 20, tanpa pembagian supaya tetap bilangan bulat.
  if (amount > 0 && remaining * 100 < amount * LOW_REMAINING_PERCENT) return 'low'
  return 'ok'
}

/** Lebar bar progres 0–100 (dibatasi), untuk tampilan saja. */
export function progressPercent(used: Rupiah, amount: Rupiah): number {
  if (amount <= 0) return used > 0 ? 100 : 0
  return Math.min(100, Math.max(0, Math.round((used * 100) / amount)))
}

export interface TemplatePot {
  name: string
  icon: string
  color: ColorKey
  percent: number
}

export const TEMPLATE_50_30_20: readonly TemplatePot[] = [
  { name: 'Kebutuhan', icon: 'house', color: 'teal', percent: 50 },
  { name: 'Keinginan', icon: 'sparkles', color: 'pink', percent: 30 },
  { name: 'Tabungan', icon: 'piggy-bank', color: 'indigo', percent: 20 },
]

/** Pos baru dari template; nominal dibagi tepat dari total dana. */
export function potsFromTemplate(
  template: readonly TemplatePot[],
  budgetId: string,
  totalFund: Rupiah,
  makeId: () => string,
): BudgetPot[] {
  const amounts = splitByPercents(totalFund, template.map((t) => t.percent))
  return template.map((t, index) => {
    const id = makeId()
    return { id, key: id, budgetId, name: t.name, icon: t.icon, color: t.color, amount: amounts[index] ?? 0, sort: index }
  })
}

/** Salinan pos untuk bulan lain: key tetap sama, pemakaian manual tidak ikut. */
export function copyPots(source: readonly BudgetPot[], budgetId: string, makeId: () => string): BudgetPot[] {
  return [...source]
    .sort((a, b) => a.sort - b.sort)
    .map((pot, index) => ({
      id: makeId(),
      key: pot.key,
      budgetId,
      name: pot.name,
      icon: pot.icon,
      color: pot.color,
      amount: pot.amount,
      sort: index,
    }))
}
