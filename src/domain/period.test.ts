import { describe, expect, it } from 'vitest'
import { makeTransaction } from '../test/freshDb'
import { monthPeriod, periodLabel, periodRange, rangePeriod, shiftMonth, summarize } from './period'

describe('periode', () => {
  it('periode bulanan mencakup tanggal 1 sampai akhir bulan', () => {
    expect(periodRange(monthPeriod('2026-02'))).toEqual({ start: '2026-02-01', end: '2026-02-28' })
  })

  it('rentang kustom dibalik bila urutannya terbalik', () => {
    expect(rangePeriod('2026-11-20', '2026-11-01')).toEqual({ kind: 'range', start: '2026-11-01', end: '2026-11-20' })
    expect(() => rangePeriod('2026-11-31', '2026-12-01')).toThrow(/tidak valid/)
  })

  it('shiftMonth hanya menggeser periode bulanan', () => {
    expect(shiftMonth(monthPeriod('2026-01'), -1)).toEqual(monthPeriod('2025-12'))
    const range = rangePeriod('2026-11-01', '2026-11-05')
    expect(shiftMonth(range, 1)).toBe(range)
  })

  it('label', () => {
    expect(periodLabel(monthPeriod('2026-11'))).toBe('November 2026')
    expect(periodLabel(rangePeriod('2026-11-01', '2026-11-15'))).toBe('1 Nov 2026 – 15 Nov 2026')
    expect(periodLabel(rangePeriod('2026-11-05', '2026-11-05'))).toBe('5 Nov 2026')
  })
})

describe('summarize', () => {
  const txs = [
    makeTransaction({ id: '1', type: 'income', amount: 5_000_000, date: '2026-11-01' }),
    makeTransaction({ id: '2', type: 'expense', amount: 25_000, date: '2026-11-15' }),
    makeTransaction({ id: '3', type: 'expense', amount: 75_000, date: '2026-11-30' }),
    makeTransaction({ id: '4', type: 'transfer', amount: 1_000_000, date: '2026-11-10' }),
    makeTransaction({ id: '5', type: 'expense', amount: 999, date: '2026-10-31' }),
    makeTransaction({ id: '6', type: 'income', amount: 999, date: '2026-12-01' }),
  ]

  it('menjumlah pemasukan dan pengeluaran dalam periode, transfer tidak dihitung', () => {
    expect(summarize(txs, periodRange(monthPeriod('2026-11')))).toEqual({
      income: 5_000_000,
      expense: 100_000,
      net: 4_900_000,
    })
  })

  it('selisih bisa negatif', () => {
    expect(summarize(txs, { start: '2026-11-02', end: '2026-11-30' })).toEqual({ income: 0, expense: 100_000, net: -100_000 })
  })
})
