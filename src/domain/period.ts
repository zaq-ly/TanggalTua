import type { DateString, MonthString, Rupiah, Transaction } from '../db/types'
import { addMonths, formatDate, formatMonth, isDateInRange, isDateString, monthRange } from '../lib/date'
import { assertRupiah } from '../lib/money'

export type Period = { kind: 'month'; month: MonthString } | { kind: 'range'; start: DateString; end: DateString }

export interface DateRange {
  start: DateString
  end: DateString
}

export function monthPeriod(month: MonthString): Period {
  return { kind: 'month', month }
}

/** Rentang dibalik otomatis bila tanggal awal lebih besar dari tanggal akhir. */
export function rangePeriod(a: DateString, b: DateString): Period {
  if (!isDateString(a) || !isDateString(b)) {
    throw new RangeError('Tanggal rentang tidak valid. Pilih tanggal awal dan akhir dari kalender.')
  }
  return a <= b ? { kind: 'range', start: a, end: b } : { kind: 'range', start: b, end: a }
}

export function periodRange(period: Period): DateRange {
  return period.kind === 'month' ? monthRange(period.month) : { start: period.start, end: period.end }
}

/** Untuk tombol sebelumnya/berikutnya; hanya berlaku pada periode bulanan. */
export function shiftMonth(period: Period, months: number): Period {
  return period.kind === 'month' ? monthPeriod(addMonths(period.month, months)) : period
}

/** `November 2026`, atau `1 Nov 2026 – 15 Nov 2026` untuk rentang. */
export function periodLabel(period: Period): string {
  if (period.kind === 'month') return formatMonth(period.month)
  if (period.start === period.end) return formatDate(period.start)
  return `${formatDate(period.start)} – ${formatDate(period.end)}`
}

/** Anggaran selalu per bulan (PRD F5); untuk rentang kustom dipakai bulan tanggal awalnya. */
export function budgetMonth(period: Period): MonthString {
  return period.kind === 'month' ? period.month : period.start.slice(0, 7)
}

export function inPeriod(tx: Transaction, range: DateRange): boolean {
  return isDateInRange(tx.date, range.start, range.end)
}

export interface PeriodSummary {
  income: Rupiah
  expense: Rupiah
  /** Pemasukan − pengeluaran. */
  net: Rupiah
}

/** Transfer tidak masuk pemasukan maupun pengeluaran (AGENTS.md aturan 3). */
export function summarize(transactions: readonly Transaction[], range: DateRange): PeriodSummary {
  let income = 0
  let expense = 0
  for (const tx of transactions) {
    if (!inPeriod(tx, range)) continue
    if (tx.type === 'income') income += tx.amount
    else if (tx.type === 'expense') expense += tx.amount
  }
  assertRupiah(income, 'Total pemasukan')
  assertRupiah(expense, 'Total pengeluaran')
  return { income, expense, net: income - expense }
}
