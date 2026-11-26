import { describe, expect, it } from 'vitest'
import type { Category } from '../db/types'
import { makeTransaction } from '../test/freshDb'
import { FOLDED_LABEL, categoryTotals, monthlyTotals, shareTenths, toSlices } from './stats'

function category(id: string, kind: Category['kind'] = 'expense'): Category {
  return { id, kind, name: id, icon: 'tag', color: 'blue', archived: false, sort: 0 }
}

const november = { start: '2026-11-01', end: '2026-11-30' }

describe('shareTenths', () => {
  it('membulatkan satu desimal dan selalu berjumlah 100%', () => {
    expect(shareTenths([1, 1, 1])).toEqual([334, 333, 333])
    expect(shareTenths([2, 1])).toEqual([667, 333])
    for (const values of [[7, 13, 29, 51], [1, 1, 1, 1, 1, 1, 1], [999_999, 1], [5]]) {
      expect(shareTenths(values).reduce((a, b) => a + b, 0)).toBe(1000)
    }
  })

  it('semua nol bila tidak ada data', () => {
    expect(shareTenths([0, 0])).toEqual([0, 0])
    expect(shareTenths([])).toEqual([])
  })
})

describe('categoryTotals', () => {
  const categories = [category('makan'), category('kopi'), category('bensin'), category('gaji', 'income')]
  const txs = [
    makeTransaction({ id: '1', categoryId: 'makan', amount: 60_000, date: '2026-11-02' }),
    makeTransaction({ id: '2', categoryId: 'makan', amount: 40_000, date: '2026-11-30' }),
    makeTransaction({ id: '3', categoryId: 'kopi', amount: 50_000, date: '2026-11-15' }),
    makeTransaction({ id: '4', categoryId: 'bensin', amount: 999, date: '2026-10-31' }),
    makeTransaction({ id: '5', type: 'income', categoryId: 'gaji', amount: 5_000_000, date: '2026-11-01' }),
    makeTransaction({ id: '6', type: 'transfer', amount: 1_000_000, date: '2026-11-03' }),
  ]

  it('menjumlah per kategori dalam periode, terbesar dulu, dengan persen', () => {
    const rows = categoryTotals(txs, categories, 'expense', november)
    expect(rows.map((r) => [r.categoryId, r.total, r.shareTenths])).toEqual([
      ['makan', 100_000, 667],
      ['kopi', 50_000, 333],
    ])
  })

  it('pemasukan terpisah, transfer tidak pernah ikut', () => {
    expect(categoryTotals(txs, categories, 'income', november).map((r) => [r.categoryId, r.total, r.shareTenths])).toEqual([
      ['gaji', 5_000_000, 1000],
    ])
  })

  it('kategori yang sudah dihapus tetap terhitung tanpa data kategori', () => {
    const rows = categoryTotals([makeTransaction({ id: '1', categoryId: 'hilang', date: '2026-11-05' })], [], 'expense', november)
    expect(rows[0]).toMatchObject({ categoryId: 'hilang', category: undefined, total: 10_000 })
  })
})

describe('toSlices', () => {
  const rows = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id, i) => ({
    categoryId: id,
    category: category(id),
    total: (8 - i) * 1_000,
    shareTenths: 0,
  }))

  it('tidak menggabung bila potongan cukup sedikit', () => {
    expect(toSlices(rows.slice(0, 6))).toHaveLength(6)
  })

  it('menggabung ekor menjadi Kategori lain', () => {
    const slices = toSlices(rows)
    expect(slices).toHaveLength(6)
    expect(slices.at(-1)).toMatchObject({ label: FOLDED_LABEL, color: null, total: 3_000 + 2_000 + 1_000 })
    expect(slices.slice(0, 5).map((s) => s.key)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})

describe('monthlyTotals', () => {
  it('enam bulan berakhir di bulan terpilih, melewati batas tahun, transfer tidak dihitung', () => {
    const txs = [
      makeTransaction({ id: '1', type: 'income', amount: 3_000_000, date: '2026-01-25' }),
      makeTransaction({ id: '2', amount: 100_000, date: '2025-12-31' }),
      makeTransaction({ id: '3', amount: 999, date: '2025-07-31' }),
      makeTransaction({ id: '4', type: 'transfer', amount: 500_000, date: '2026-01-02' }),
      makeTransaction({ id: '5', amount: 999, date: '2026-02-01' }),
    ]
    expect(monthlyTotals(txs, '2026-01')).toEqual([
      { month: '2025-08', income: 0, expense: 0 },
      { month: '2025-09', income: 0, expense: 0 },
      { month: '2025-10', income: 0, expense: 0 },
      { month: '2025-11', income: 0, expense: 0 },
      { month: '2025-12', income: 0, expense: 100_000 },
      { month: '2026-01', income: 3_000_000, expense: 0 },
    ])
  })
})
