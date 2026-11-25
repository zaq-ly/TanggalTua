import { describe, expect, it } from 'vitest'
import { buildDefaultCategories, DEFAULT_WALLET_PRESETS } from './defaults'
import { NAME_MAX_LENGTH, normalizeName, validateName } from './names'
import { bySort, moveInOrder, nextSort, sortUpdates } from './ordering'
import { validateStartBalance } from './wallets'
import { MAX_RUPIAH } from '../lib/money'
import { isColorKey } from '../lib/palette'

describe('nama', () => {
  it('normalizeName merapikan spasi', () => {
    expect(normalizeName('  Kopi   Pagi ')).toBe('Kopi Pagi')
  })

  it('menolak nama kosong dan terlalu panjang', () => {
    expect(validateName('   ', [], 'dompet')).toBe('Nama dompet wajib diisi.')
    expect(validateName('a'.repeat(NAME_MAX_LENGTH + 1), [], 'dompet')).toMatch(/Maksimal 30/)
    expect(validateName('a'.repeat(NAME_MAX_LENGTH), [], 'dompet')).toBeNull()
  })

  it('menolak nama kembar tanpa peduli huruf besar dan spasi', () => {
    expect(validateName(' mybca ', ['MyBCA'], 'dompet')).toBe('Sudah ada dompet bernama "mybca". Pakai nama lain.')
    expect(validateName('MyBCA Bisnis', ['MyBCA'], 'dompet')).toBeNull()
  })
})

describe('urutan', () => {
  const ids = ['a', 'b', 'c']

  it('moveInOrder menggeser ke atas dan ke bawah', () => {
    expect(moveInOrder(ids, 'b', 'up')).toEqual(['b', 'a', 'c'])
    expect(moveInOrder(ids, 'b', 'down')).toEqual(['a', 'c', 'b'])
  })

  it('moveInOrder tidak berubah di ujung atau bila id tidak ada', () => {
    expect(moveInOrder(ids, 'a', 'up')).toEqual(ids)
    expect(moveInOrder(ids, 'c', 'down')).toEqual(ids)
    expect(moveInOrder(ids, 'x', 'up')).toEqual(ids)
  })

  it('sortUpdates dan nextSort', () => {
    expect(sortUpdates(['c', 'a'])).toEqual([
      { id: 'c', sort: 0 },
      { id: 'a', sort: 1 },
    ])
    expect(nextSort([])).toBe(0)
    expect(nextSort([{ sort: 0 }, { sort: 4 }])).toBe(5)
  })

  it('bySort memakai nama sebagai pengurut kedua', () => {
    const items = [
      { sort: 1, name: 'B' },
      { sort: 0, name: 'Z' },
      { sort: 1, name: 'A' },
    ]
    expect([...items].sort(bySort).map((i) => i.name)).toEqual(['Z', 'A', 'B'])
  })
})

describe('validateStartBalance', () => {
  it('menerima 0 sampai batas', () => {
    expect(validateStartBalance(0)).toBeNull()
    expect(validateStartBalance(MAX_RUPIAH)).toBeNull()
  })

  it('menolak negatif, pecahan, dan melebihi batas', () => {
    expect(validateStartBalance(-1)).toMatch(/tidak boleh negatif/)
    expect(validateStartBalance(1000.5)).toMatch(/tanpa desimal/)
    expect(validateStartBalance(MAX_RUPIAH + 1)).toMatch(/maksimal/)
  })
})

describe('data bawaan', () => {
  it('kategori bawaan sesuai PRD', () => {
    let n = 0
    const categories = buildDefaultCategories(() => `id-${n++}`)
    const names = (kind: string) => categories.filter((c) => c.kind === kind).map((c) => c.name)
    expect(names('expense')).toEqual([
      'Makanan',
      'Minuman/Kopi',
      'Transport/Bensin',
      'Pulsa/Kuota',
      'Tagihan Rumah',
      'Skincare',
      'Outfit',
      'Hobi/Sepeda',
      'Hiburan',
      'Tabungan',
      'Lainnya',
    ])
    expect(names('income')).toEqual(['Gaji', 'Bonus', 'Freelance', 'Hadiah', 'Lainnya'])
    expect(new Set(categories.map((c) => c.id)).size).toBe(categories.length)
    expect(categories.every((c) => !c.archived && isColorKey(c.color))).toBe(true)
  })

  it('dompet contoh sesuai PRD', () => {
    expect(DEFAULT_WALLET_PRESETS.map((w) => w.name)).toEqual(['MyBCA', 'BRImo', 'Tunai'])
  })
})
