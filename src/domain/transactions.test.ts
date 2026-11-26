import { describe, expect, it } from 'vitest'
import type { Category, Transaction, Wallet } from '../db/types'
import { makeTransaction } from '../test/freshDb'
import {
  byNewest,
  groupByDate,
  matchesFilter,
  normalizeNote,
  preferredWalletId,
  signedAmount,
  toDraft,
  toStored,
  validateTransaction,
  type LookupContext,
  type TransactionDraft,
} from './transactions'

function wallet(id: string, archived = false): Wallet {
  return { id, name: id.toUpperCase(), icon: 'wallet', color: 'blue', startBalance: 0, archived, sort: 0 }
}

function category(id: string, kind: Category['kind'], name = id): Category {
  return { id, kind, name, icon: 'tag', color: 'blue', archived: false, sort: 0 }
}

const ctx: LookupContext = {
  wallets: new Map([['bca', wallet('bca')], ['tunai', wallet('tunai')]]),
  categories: new Map([
    ['kopi', category('kopi', 'expense', 'Minuman/Kopi')],
    ['gaji', category('gaji', 'income', 'Gaji')],
  ]),
}

const expense: TransactionDraft = { type: 'expense', amount: 25_000, date: '2026-11-25', walletId: 'bca', categoryId: 'kopi' }

describe('validateTransaction', () => {
  it('menerima pengeluaran, pemasukan, dan transfer yang lengkap', () => {
    expect(validateTransaction(expense, ctx)).toBeNull()
    expect(validateTransaction({ ...expense, type: 'income', categoryId: 'gaji' }, ctx)).toBeNull()
    expect(
      validateTransaction({ type: 'transfer', amount: 1, date: '2026-11-25', fromWalletId: 'bca', toWalletId: 'tunai' }, ctx),
    ).toBeNull()
  })

  it('jumlah harus bilangan bulat lebih dari 0', () => {
    expect(validateTransaction({ ...expense, amount: 0 }, ctx)).toBe('Isi jumlah lebih dari Rp0.')
    expect(validateTransaction({ ...expense, amount: -5 }, ctx)).toBe('Isi jumlah lebih dari Rp0.')
    expect(validateTransaction({ ...expense, amount: 10.5 }, ctx)).toMatch(/tanpa desimal/)
  })

  it('menolak tanggal tidak valid', () => {
    expect(validateTransaction({ ...expense, date: '2026-02-30' }, ctx)).toMatch(/Tanggal tidak valid/)
  })

  it('pengeluaran dan pemasukan wajib dompet dan kategori yang jenisnya cocok', () => {
    expect(validateTransaction({ ...expense, walletId: undefined }, ctx)).toBe('Pilih dompet.')
    expect(validateTransaction({ ...expense, walletId: 'hilang' }, ctx)).toBe('Pilih dompet.')
    expect(validateTransaction({ ...expense, categoryId: undefined }, ctx)).toBe('Pilih kategori.')
    expect(validateTransaction({ ...expense, categoryId: 'gaji' }, ctx)).toBe('Pilih kategori pengeluaran.')
    expect(validateTransaction({ ...expense, type: 'income' }, ctx)).toBe('Pilih kategori pemasukan.')
  })

  it('transfer wajib dompet asal dan tujuan yang berbeda', () => {
    const transfer: TransactionDraft = { type: 'transfer', amount: 1, date: '2026-11-25' }
    expect(validateTransaction(transfer, ctx)).toBe('Pilih dompet asal transfer.')
    expect(validateTransaction({ ...transfer, fromWalletId: 'bca' }, ctx)).toBe('Pilih dompet tujuan transfer.')
    expect(validateTransaction({ ...transfer, fromWalletId: 'bca', toWalletId: 'bca' }, ctx)).toBe(
      'Dompet asal dan tujuan harus berbeda.',
    )
  })

  it('membatasi panjang catatan', () => {
    expect(validateTransaction({ ...expense, note: 'a'.repeat(201) }, ctx)).toMatch(/Maksimal 200/)
  })
})

describe('toStored dan toDraft', () => {
  it('membuang field yang tidak berlaku untuk jenisnya dan merapikan catatan', () => {
    const stored = toStored(
      { ...expense, type: 'transfer', fromWalletId: 'bca', toWalletId: 'tunai', note: '   ' },
      { id: 'x', createdAt: 1, updatedAt: 2 },
    )
    expect(stored).toEqual({
      id: 'x',
      type: 'transfer',
      amount: 25_000,
      date: '2026-11-25',
      fromWalletId: 'bca',
      toWalletId: 'tunai',
      createdAt: 1,
      updatedAt: 2,
    })
    expect(Object.keys(stored)).not.toContain('categoryId')
    expect(Object.keys(stored)).not.toContain('note')
  })

  it('bolak-balik draft tanpa kehilangan data', () => {
    const stored = toStored({ ...expense, note: 'Kopi susu' }, { id: 'x', createdAt: 1, updatedAt: 1 })
    expect(toStored(toDraft(stored), { id: 'x', createdAt: 1, updatedAt: 1 })).toEqual(stored)
  })

  it('normalizeNote', () => {
    expect(normalizeNote('  kopi   susu ')).toBe('kopi susu')
    expect(normalizeNote('')).toBeUndefined()
    expect(normalizeNote(undefined)).toBeUndefined()
  })
})

describe('urutan dan pengelompokan', () => {
  const txs: Transaction[] = [
    makeTransaction({ id: 'a', date: '2026-11-24', createdAt: 5, type: 'income', amount: 100_000 }),
    makeTransaction({ id: 'b', date: '2026-11-25', createdAt: 1, amount: 20_000 }),
    makeTransaction({ id: 'c', date: '2026-11-25', createdAt: 9, amount: 5_000 }),
    makeTransaction({ id: 'd', date: '2026-11-25', createdAt: 3, type: 'transfer', amount: 500_000 }),
  ]

  it('byNewest: tanggal menurun lalu waktu dibuat menurun', () => {
    expect([...txs].sort(byNewest).map((t) => t.id)).toEqual(['c', 'd', 'b', 'a'])
  })

  it('groupByDate menghitung selisih harian tanpa transfer', () => {
    const groups = groupByDate([...txs].sort(byNewest))
    expect(groups.map((g) => [g.date, g.items.length, g.net])).toEqual([
      ['2026-11-25', 3, -25_000],
      ['2026-11-24', 1, 100_000],
    ])
  })

  it('signedAmount: transfer bernilai 0', () => {
    expect(txs.map(signedAmount)).toEqual([100_000, -20_000, -5_000, 0])
  })
})

describe('matchesFilter', () => {
  const kopi = makeTransaction({ id: '1', walletId: 'bca', categoryId: 'kopi', note: 'Kopi susu gula aren' })
  const transfer = makeTransaction({ id: '2', type: 'transfer', fromWalletId: 'tunai', toWalletId: 'bca' })

  it('mencari di catatan dan nama kategori tanpa peduli huruf besar', () => {
    expect(matchesFilter(kopi, { query: 'AREN' }, ctx)).toBe(true)
    expect(matchesFilter(kopi, { query: 'minuman' }, ctx)).toBe(true)
    expect(matchesFilter(kopi, { query: 'bensin' }, ctx)).toBe(false)
  })

  it('filter dompet mencakup dompet asal dan tujuan transfer', () => {
    expect(matchesFilter(transfer, { query: '', walletId: 'bca' }, ctx)).toBe(true)
    expect(matchesFilter(transfer, { query: '', walletId: 'tunai' }, ctx)).toBe(true)
    expect(matchesFilter(kopi, { query: '', walletId: 'tunai' }, ctx)).toBe(false)
  })

  it('filter kategori', () => {
    expect(matchesFilter(kopi, { query: '', categoryId: 'kopi' }, ctx)).toBe(true)
    expect(matchesFilter(transfer, { query: '', categoryId: 'kopi' }, ctx)).toBe(false)
  })
})

describe('preferredWalletId', () => {
  const active = [wallet('bca'), wallet('tunai')]

  it('memakai dompet transaksi terakhir yang masih aktif', () => {
    const latest = [
      makeTransaction({ id: '1', walletId: 'lama' }),
      makeTransaction({ id: '2', type: 'transfer', fromWalletId: 'tunai', toWalletId: 'bca' }),
    ]
    expect(preferredWalletId(latest, active)).toBe('tunai')
  })

  it('jatuh ke dompet aktif pertama', () => {
    expect(preferredWalletId([], active)).toBe('bca')
    expect(preferredWalletId([], [])).toBeUndefined()
  })
})
