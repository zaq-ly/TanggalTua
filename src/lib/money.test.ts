import { describe, expect, it } from 'vitest'
import {
  MAX_RUPIAH,
  assertRupiah,
  formatRupiah,
  formatRupiahCompact,
  formatThousands,
  isRupiah,
  parseRupiahInput,
  sumRupiah,
} from './money'

describe('isRupiah dan assertRupiah', () => {
  it('menerima bilangan bulat, termasuk nol dan negatif', () => {
    expect(isRupiah(0)).toBe(true)
    expect(isRupiah(1_250_000)).toBe(true)
    expect(isRupiah(-5_000)).toBe(true)
  })

  it('menolak pecahan, NaN, tak hingga, dan bukan angka', () => {
    expect(isRupiah(1.5)).toBe(false)
    expect(isRupiah(Number.NaN)).toBe(false)
    expect(isRupiah(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isRupiah('1000')).toBe(false)
    expect(() => assertRupiah(0.1 + 0.2)).toThrow(/bilangan bulat/)
  })
})

describe('sumRupiah', () => {
  it('menjumlah dan tetap integer', () => {
    expect(sumRupiah([10_000, 25_500, -5_500])).toBe(30_000)
    expect(sumRupiah([])).toBe(0)
  })

  it('menolak nilai pecahan di tengah daftar', () => {
    expect(() => sumRupiah([1_000, 2.5])).toThrow(TypeError)
  })
})

describe('formatThousands dan formatRupiah', () => {
  it.each([
    [0, 'Rp0'],
    [999, 'Rp999'],
    [1_000, 'Rp1.000'],
    [1_234_567, 'Rp1.234.567'],
    [100_000_000, 'Rp100.000.000'],
    [-5_000, '-Rp5.000'],
  ])('%d menjadi %s', (value, expected) => {
    expect(formatRupiah(value)).toBe(expected)
  })

  it('memformat tanpa awalan Rp untuk keypad', () => {
    expect(formatThousands(2_000_000)).toBe('2.000.000')
    expect(formatThousands(-12_345)).toBe('-12.345')
  })

  it('menolak pecahan', () => {
    expect(() => formatRupiah(10.5)).toThrow(TypeError)
  })
})

describe('formatRupiahCompact', () => {
  it.each([
    [0, 'Rp0'],
    [950, 'Rp950'],
    [1_000, 'Rp1 rb'],
    [1_500, 'Rp1,5 rb'],
    [850_000, 'Rp850 rb'],
    [1_200_000, 'Rp1,2 jt'],
    [1_250_000, 'Rp1,3 jt'],
    [2_000_000, 'Rp2 jt'],
    [12_345_678, 'Rp12,3 jt'],
    [150_400_000, 'Rp150 jt'],
    [2_500_000_000, 'Rp2,5 M'],
    [3_000_000_000_000, 'Rp3 T'],
    [-1_200_000, '-Rp1,2 jt'],
  ])('%d menjadi %s', (value, expected) => {
    expect(formatRupiahCompact(value)).toBe(expected)
  })

  it('pembulatan yang mencapai 1.000 naik ke satuan berikutnya', () => {
    expect(formatRupiahCompact(999_950)).toBe('Rp1 jt')
    expect(formatRupiahCompact(999_600_000)).toBe('Rp1 M')
    expect(formatRupiahCompact(99_960_000)).toBe('Rp100 jt')
  })
})

describe('parseRupiahInput', () => {
  it.each([
    ['1250000', 1_250_000],
    ['Rp1.250.000', 1_250_000],
    ['  12.000 ', 12_000],
    ['0', 0],
    ['0005000', 5_000],
  ])('%s menjadi %d', (text, expected) => {
    expect(parseRupiahInput(text)).toBe(expected)
  })

  it('mengabaikan koma dan tidak pernah menghasilkan pecahan', () => {
    expect(parseRupiahInput('1.000,50')).toBe(100_050)
  })

  it('mengembalikan null untuk input kosong atau melebihi batas', () => {
    expect(parseRupiahInput('')).toBeNull()
    expect(parseRupiahInput('abc')).toBeNull()
    expect(parseRupiahInput(String(MAX_RUPIAH))).toBe(MAX_RUPIAH)
    expect(parseRupiahInput(String(MAX_RUPIAH + 1))).toBeNull()
  })
})
