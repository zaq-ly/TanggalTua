import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  currentMonth,
  formatDate,
  formatMonth,
  isDateInRange,
  isDateString,
  isMonthString,
  monthOf,
  monthRange,
  parseDateString,
  relativeDayLabel,
  toDateString,
  todayDateString,
} from './date'

describe('toDateString dan todayDateString', () => {
  it('memakai tanggal lokal, bukan UTC', () => {
    // 23:30 dan 00:15 waktu lokal tetap di hari yang sama, apa pun zona waktunya.
    expect(toDateString(new Date(2026, 10, 25, 23, 30))).toBe('2026-11-25')
    expect(todayDateString(new Date(2026, 10, 25, 0, 15))).toBe('2026-11-25')
  })

  it('memberi nol di depan bulan dan hari', () => {
    expect(toDateString(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('validasi', () => {
  it.each(['2026-11-25', '2024-02-29', '2026-12-31'])('%s valid', (value) => {
    expect(isDateString(value)).toBe(true)
  })

  it.each(['2026-02-29', '2026-13-01', '2026-00-10', '2026-11-31', '2026-1-5', '25-11-2026', '', 20261125])(
    '%s tidak valid',
    (value) => {
      expect(isDateString(value)).toBe(false)
    },
  )

  it('memvalidasi bulan', () => {
    expect(isMonthString('2026-11')).toBe(true)
    expect(isMonthString('2026-13')).toBe(false)
    expect(isMonthString('2026-11-01')).toBe(false)
  })
})

describe('parseDateString', () => {
  it('menghasilkan tengah malam lokal', () => {
    const date = parseDateString('2026-11-25')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(10)
    expect(date.getDate()).toBe(25)
    expect(date.getHours()).toBe(0)
  })

  it('melempar galat yang menjelaskan format', () => {
    expect(() => parseDateString('2026-02-30')).toThrow(/YYYY-MM-DD/)
  })
})

describe('format tampilan', () => {
  it('formatDate memakai singkatan bulan Indonesia', () => {
    expect(formatDate('2026-11-25')).toBe('25 Nov 2026')
    expect(formatDate('2026-05-01')).toBe('1 Mei 2026')
    expect(formatDate('2026-08-17')).toBe('17 Agu 2026')
    expect(formatDate('2026-12-03')).toBe('3 Des 2026')
  })

  it('formatMonth memakai nama bulan lengkap', () => {
    expect(formatMonth('2026-11')).toBe('November 2026')
    expect(formatMonth('2027-01')).toBe('Januari 2027')
  })
})

describe('aritmetika tanggal dan bulan', () => {
  it('addDays melewati batas bulan dan tahun', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('addMonths melewati batas tahun ke dua arah', () => {
    expect(addMonths('2026-11', 1)).toBe('2026-12')
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-11', -23)).toBe('2024-12')
  })

  it('monthOf dan currentMonth', () => {
    expect(monthOf('2026-11-25')).toBe('2026-11')
    expect(currentMonth(new Date(2026, 10, 25, 23, 59))).toBe('2026-11')
  })

  it('monthRange menghitung hari terakhir termasuk tahun kabisat', () => {
    expect(monthRange('2026-11')).toEqual({ start: '2026-11-01', end: '2026-11-30' })
    expect(monthRange('2024-02')).toEqual({ start: '2024-02-01', end: '2024-02-29' })
    expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' })
  })

  it('relativeDayLabel', () => {
    expect(relativeDayLabel('2026-11-25', '2026-11-25')).toBe('Hari ini')
    expect(relativeDayLabel('2026-11-24', '2026-11-25')).toBe('Kemarin')
    expect(relativeDayLabel('2026-12-31', '2027-01-01')).toBe('Kemarin')
    expect(relativeDayLabel('2026-11-23', '2026-11-25')).toBe('23 Nov 2026')
    expect(relativeDayLabel('2026-11-26', '2026-11-25')).toBe('26 Nov 2026')
  })

  it('isDateInRange inklusif di kedua ujung', () => {
    const { start, end } = monthRange('2026-11')
    expect(isDateInRange('2026-11-01', start, end)).toBe(true)
    expect(isDateInRange('2026-11-30', start, end)).toBe(true)
    expect(isDateInRange('2026-12-01', start, end)).toBe(false)
    expect(isDateInRange('2026-10-31', start, end)).toBe(false)
  })
})
