import type { Rupiah } from '../db/types'

/** Batas atas jumlah yang bisa dimasukkan (12 digit, < Rp1 triliun). */
export const MAX_RUPIAH: Rupiah = 999_999_999_999

export function isRupiah(value: unknown): value is Rupiah {
  return typeof value === 'number' && Number.isSafeInteger(value)
}

export function assertRupiah(value: number, label = 'Jumlah'): asserts value is Rupiah {
  if (!isRupiah(value)) {
    throw new TypeError(`${label} harus bilangan bulat rupiah, bukan ${String(value)}.`)
  }
}

export function sumRupiah(values: Iterable<Rupiah>): Rupiah {
  let total = 0
  for (const value of values) {
    assertRupiah(value)
    total += value
  }
  assertRupiah(total, 'Total')
  return total
}

/** `1234567` → `1.234.567`. */
export function formatThousands(value: Rupiah): string {
  assertRupiah(value)
  const digits = Math.abs(value).toString()
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return value < 0 ? `-${grouped}` : grouped
}

/** `1234567` → `Rp1.234.567`, `-5000` → `-Rp5.000`. */
export function formatRupiah(value: Rupiah): string {
  const formatted = formatThousands(Math.abs(value))
  return value < 0 ? `-Rp${formatted}` : `Rp${formatted}`
}

const COMPACT_UNITS = [
  { size: 1_000_000_000_000, suffix: 'T' },
  { size: 1_000_000_000, suffix: 'M' },
  { size: 1_000_000, suffix: 'jt' },
  { size: 1_000, suffix: 'rb' },
] as const

/**
 * Versi ringkas untuk label grafik: `Rp1,2 jt`, `Rp850 rb`, `Rp2 M`.
 * Hanya untuk tampilan; perhitungan tetap memakai nilai penuh.
 */
export function formatRupiahCompact(value: Rupiah): string {
  assertRupiah(value)
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  let index = COMPACT_UNITS.findIndex((unit) => abs >= unit.size)
  if (index === -1) return `${sign}Rp${formatThousands(abs)}`

  for (;;) {
    const unit = COMPACT_UNITS[index] ?? COMPACT_UNITS[0]
    // Satu desimal hanya di bawah 100 satuan, supaya label tetap pendek.
    const tenths = Math.round((abs * 10) / unit.size)
    const shownTenths = tenths < 1000 ? tenths : Math.round(abs / unit.size) * 10
    // Pembulatan yang mencapai 1.000 naik satuan: Rp999.950 menjadi Rp1 jt, bukan Rp1.000 rb.
    if (shownTenths >= 10_000 && index > 0) {
      index -= 1
      continue
    }
    const whole = Math.floor(shownTenths / 10)
    const fraction = shownTenths % 10
    const number = fraction === 0 ? formatThousands(whole) : `${whole},${fraction}`
    return `${sign}Rp${number} ${unit.suffix}`
  }
}

/**
 * Mengambil digit dari teks input (`"Rp1.250.000"` → `1250000`).
 * Mengembalikan `null` bila tidak ada digit atau melebihi `MAX_RUPIAH`.
 */
export function parseRupiahInput(text: string): Rupiah | null {
  const digits = text.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  if (digits === '') return null
  if (digits.length > MAX_RUPIAH.toString().length) return null
  const value = Number(digits)
  return value <= MAX_RUPIAH ? value : null
}
