import { describe, expect, it } from 'vitest'
import type { BudgetPot, Category } from '../db/types'
import { makeTransaction } from '../test/freshDb'
import {
  TEMPLATE_50_30_20,
  amountFromPercent,
  copyPots,
  formatPercentTenths,
  percentTenths,
  potStatus,
  potUsage,
  potsFromTemplate,
  progressPercent,
  splitByPercents,
  unallocated,
  validateFund,
} from './budget'

function pot(overrides: Partial<BudgetPot> = {}): BudgetPot {
  return { id: 'p', key: 'k', budgetId: 'b', name: 'Kebutuhan', icon: 'house', color: 'teal', amount: 1_000_000, sort: 0, ...overrides }
}

function category(id: string, budgetPotId?: string, kind: Category['kind'] = 'expense'): Category {
  return { id, kind, name: id, icon: 'tag', color: 'blue', archived: false, sort: 0, budgetPotId }
}

const november = { start: '2026-11-01', end: '2026-11-30' }

describe('konversi persen dan nominal', () => {
  it('persen dari nominal dibulatkan satu desimal', () => {
    expect(percentTenths(1_000_000, 2_000_000)).toBe(500)
    expect(percentTenths(1_000_000, 3_000_000)).toBe(333)
    expect(percentTenths(2_000_000, 3_000_000)).toBe(667)
    expect(percentTenths(500_000, 0)).toBeNull()
  })

  it('format persen memakai koma', () => {
    expect(formatPercentTenths(333)).toBe('33,3%')
    expect(formatPercentTenths(500)).toBe('50%')
    expect(formatPercentTenths(1250)).toBe('125%')
  })

  it('nominal dari persen dibulatkan ke rupiah', () => {
    expect(amountFromPercent(50, 2_000_000)).toBe(1_000_000)
    expect(amountFromPercent(33, 1_000_001)).toBe(330_000)
    expect(amountFromPercent(30, 3_333)).toBe(1_000)
    expect(amountFromPercent(0, 2_000_000)).toBe(0)
    expect(() => amountFromPercent(101, 1)).toThrow(RangeError)
    expect(() => amountFromPercent(12.5, 1)).toThrow(RangeError)
  })

  it('bolak-balik persen dan nominal konsisten', () => {
    const total = 2_000_000
    const amount = amountFromPercent(30, total)
    expect(percentTenths(amount, total)).toBe(300)
  })
})

describe('splitByPercents', () => {
  it('50/30/20 berjumlah tepat sama dengan total, termasuk angka ganjil', () => {
    for (const total of [2_000_000, 1_000_001, 7, 0, 999_999]) {
      const amounts = splitByPercents(total, [50, 30, 20])
      expect(amounts.reduce((a, b) => a + b, 0)).toBe(total)
      expect(amounts.every(Number.isInteger)).toBe(true)
    }
    expect(splitByPercents(2_000_000, [50, 30, 20])).toEqual([1_000_000, 600_000, 400_000])
  })

  it('sisa pembulatan diberikan ke pecahan terbesar', () => {
    // 10 × 33/33/34 = 3,3 / 3,3 / 3,4 → 3 / 3 / 4
    expect(splitByPercents(10, [33, 33, 34])).toEqual([3, 3, 4])
    // 100 dibagi tiga sama: sisa 1 ke yang pertama.
    expect(splitByPercents(100, [33, 33, 34])).toEqual([33, 33, 34])
  })
})

describe('belum dialokasikan', () => {
  it('total dana dikurangi semua pos', () => {
    expect(unallocated(2_000_000, [{ amount: 1_000_000 }, { amount: 600_000 }])).toBe(400_000)
    expect(unallocated(2_000_000, [])).toBe(2_000_000)
  })

  it('negatif bila pos berlebih', () => {
    expect(unallocated(2_000_000, [{ amount: 1_500_000 }, { amount: 700_000 }])).toBe(-200_000)
  })
})

describe('potUsage', () => {
  const categories = [category('makan', 'k'), category('bensin', 'k'), category('kopi', 'lain'), category('gaji', 'k', 'income')]

  it('menjumlah pengeluaran kategori terkait di bulan anggaran saja', () => {
    const txs = [
      makeTransaction({ id: '1', categoryId: 'makan', amount: 100_000, date: '2026-11-01' }),
      makeTransaction({ id: '2', categoryId: 'bensin', amount: 50_000, date: '2026-11-30' }),
      makeTransaction({ id: '3', categoryId: 'kopi', amount: 999, date: '2026-11-10' }),
      makeTransaction({ id: '4', categoryId: 'makan', amount: 999, date: '2026-10-31' }),
      makeTransaction({ id: '5', categoryId: 'makan', amount: 999, date: '2026-12-01' }),
      makeTransaction({ id: '6', type: 'income', categoryId: 'gaji', amount: 999, date: '2026-11-10' }),
    ]
    const usage = potUsage(pot(), categories, txs, november)
    expect(usage).toEqual({ used: 150_000, remaining: 850_000, status: 'ok', linkedCategoryIds: ['makan', 'bensin'] })
  })

  it('pemakaian manual ditambahkan', () => {
    expect(potUsage(pot({ manualUsed: 1_000_000 }), [], [], november)).toMatchObject({ used: 1_000_000, remaining: 0, status: 'low' })
  })

  it('status berubah saat sisa di bawah 20% dan saat terlampaui', () => {
    expect(potStatus(1_000_000, 200_000)).toBe('ok')
    expect(potStatus(1_000_000, 199_999)).toBe('low')
    expect(potStatus(1_000_000, 0)).toBe('low')
    expect(potStatus(1_000_000, -1)).toBe('over')
    expect(potStatus(0, 0)).toBe('ok')
  })

  it('bar progres dibatasi 0–100', () => {
    expect(progressPercent(250_000, 1_000_000)).toBe(25)
    expect(progressPercent(2_000_000, 1_000_000)).toBe(100)
    expect(progressPercent(0, 0)).toBe(0)
    expect(progressPercent(1, 0)).toBe(100)
  })
})

describe('template dan salin', () => {
  it('template 50/30/20 membuat tiga pos dengan key = id', () => {
    let n = 0
    const pots = potsFromTemplate(TEMPLATE_50_30_20, 'b', 2_000_000, () => `id${n++}`)
    expect(pots.map((p) => [p.name, p.amount, p.sort])).toEqual([
      ['Kebutuhan', 1_000_000, 0],
      ['Keinginan', 600_000, 1],
      ['Tabungan', 400_000, 2],
    ])
    expect(pots.every((p) => p.key === p.id && p.budgetId === 'b')).toBe(true)
  })

  it('salinan menjaga key dan nominal, tanpa pemakaian manual', () => {
    let n = 0
    const source = [pot({ id: 'a', key: 'ka', sort: 1, manualUsed: 5 }), pot({ id: 'b', key: 'kb', sort: 0, name: 'Tabungan' })]
    const copied = copyPots(source, 'des', () => `baru${n++}`)
    expect(copied).toEqual([
      { id: 'baru0', key: 'kb', budgetId: 'des', name: 'Tabungan', icon: 'house', color: 'teal', amount: 1_000_000, sort: 0 },
      { id: 'baru1', key: 'ka', budgetId: 'des', name: 'Kebutuhan', icon: 'house', color: 'teal', amount: 1_000_000, sort: 1 },
    ])
  })
})

describe('validateFund', () => {
  it('menerima 0 dan menolak negatif atau pecahan', () => {
    expect(validateFund(0, 'Total dana')).toBeNull()
    expect(validateFund(-1, 'Total dana')).toBe('Total dana tidak boleh negatif.')
    expect(validateFund(1.5, 'Jatah pos')).toBe('Jatah pos harus angka rupiah tanpa desimal.')
  })
})
