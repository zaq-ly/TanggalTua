import { describe, expect, it } from 'vitest'
import { addQuick, backspace, pressKey } from './keypad'
import { MAX_RUPIAH } from './money'
import { colorVar, isColorKey } from './palette'

describe('keypad', () => {
  it('menambah digit di kanan', () => {
    expect(pressKey(0, '5')).toBe(5)
    expect(pressKey(5, '0')).toBe(50)
    expect(pressKey(12, '000')).toBe(12_000)
  })

  it('nol di awal tidak menambah digit', () => {
    expect(pressKey(0, '0')).toBe(0)
    expect(pressKey(0, '000')).toBe(0)
  })

  it('mengabaikan penekanan yang melewati batas', () => {
    expect(pressKey(MAX_RUPIAH, '1')).toBe(MAX_RUPIAH)
    expect(pressKey(99, '000', 50_000)).toBe(99)
    expect(pressKey(4_999, '9', 50_000)).toBe(49_999)
  })

  it('backspace menghapus digit terakhir', () => {
    expect(backspace(12_345)).toBe(1_234)
    expect(backspace(7)).toBe(0)
    expect(backspace(0)).toBe(0)
  })

  it('pintasan cepat menjumlah dan dibatasi', () => {
    expect(addQuick(5_000, 10_000)).toBe(15_000)
    expect(addQuick(MAX_RUPIAH - 1, 50_000)).toBe(MAX_RUPIAH)
  })
})

describe('palet', () => {
  it('kunci yang tidak dikenal jatuh ke warna cadangan', () => {
    expect(isColorKey('blue')).toBe(true)
    expect(isColorKey('#ff0000')).toBe(false)
    expect(colorVar('blue')).toBe('var(--swatch-blue)')
    expect(colorVar('#ff0000')).toBe('var(--swatch-slate)')
  })
})
