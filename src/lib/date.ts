import type { DateString, MonthString } from '../db/types'

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] as const
const MONTHS_LONG = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate()
}

/** Tanggal lokal perangkat, bukan UTC, supaya transaksi malam hari tidak pindah hari. */
export function toDateString(date: Date): DateString {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function todayDateString(now: Date = new Date()): DateString {
  return toDateString(now)
}

export function isDateString(value: unknown): value is DateString {
  if (typeof value !== 'string') return false
  const match = DATE_PATTERN.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
}

export function isMonthString(value: unknown): value is MonthString {
  if (typeof value !== 'string') return false
  const match = MONTH_PATTERN.exec(value)
  if (!match) return false
  const month = Number(match[2])
  return month >= 1 && month <= 12
}

function splitDate(value: DateString): [number, number, number] {
  if (!isDateString(value)) {
    throw new RangeError(`Tanggal "${value}" tidak valid. Gunakan format YYYY-MM-DD.`)
  }
  const [y, m, d] = value.split('-').map(Number)
  return [y ?? 0, m ?? 0, d ?? 0]
}

function splitMonth(value: MonthString): [number, number] {
  if (!isMonthString(value)) {
    throw new RangeError(`Bulan "${value}" tidak valid. Gunakan format YYYY-MM.`)
  }
  const [y, m] = value.split('-').map(Number)
  return [y ?? 0, m ?? 0]
}

/** Date pada tengah malam waktu lokal. */
export function parseDateString(value: DateString): Date {
  const [y, m, d] = splitDate(value)
  return new Date(y, m - 1, d)
}

/** `2026-11-25` → `25 Nov 2026`. */
export function formatDate(value: DateString): string {
  const [y, m, d] = splitDate(value)
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`
}

export function addDays(value: DateString, days: number): DateString {
  const [y, m, d] = splitDate(value)
  return toDateString(new Date(y, m - 1, d + days))
}

export function monthOf(value: DateString): MonthString {
  splitDate(value)
  return value.slice(0, 7)
}

export function currentMonth(now: Date = new Date()): MonthString {
  return monthOf(toDateString(now))
}

export function addMonths(value: MonthString, months: number): MonthString {
  const [y, m] = splitMonth(value)
  const index = y * 12 + (m - 1) + months
  return `${Math.floor(index / 12)}-${pad2((index % 12) + 1)}`
}

/** Rentang inklusif tanggal pertama sampai terakhir bulan. */
export function monthRange(value: MonthString): { start: DateString; end: DateString } {
  const [y, m] = splitMonth(value)
  return { start: `${value}-01`, end: `${value}-${pad2(daysInMonth(y, m))}` }
}

/** `2026-11` → `November 2026`. */
export function formatMonth(value: MonthString): string {
  const [y, m] = splitMonth(value)
  return `${MONTHS_LONG[m - 1]} ${y}`
}

/** Label header riwayat: "Hari ini", "Kemarin", atau `25 Nov 2026`. */
export function relativeDayLabel(value: DateString, today: DateString = todayDateString()): string {
  if (value === today) return 'Hari ini'
  if (value === addDays(today, -1)) return 'Kemarin'
  return formatDate(value)
}

/** Perbandingan string aman karena formatnya `YYYY-MM-DD` dengan nol di depan. */
export function isDateInRange(value: DateString, start: DateString, end: DateString): boolean {
  return value >= start && value <= end
}
