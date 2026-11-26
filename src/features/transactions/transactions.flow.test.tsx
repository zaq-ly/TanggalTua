import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { completeOnboarding } from '../../db/onboarding'
import { addTransaction } from '../../db/transactions'
import { todayDateString } from '../../lib/date'
import { routes } from '../../routes/routes'
import { useAddSheet } from './useAddSheet'
import { usePeriod } from '../../components/usePeriod'
import { monthPeriod } from '../../domain/period'
import { HISTORY_PAGE_SIZE } from './HistoryPage'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

async function seed() {
  await completeOnboarding([
    { name: 'MyBCA', icon: 'landmark', color: 'blue', startBalance: 1_000_000 },
    { name: 'Tunai', icon: 'wallet', color: 'green', startBalance: 100_000 },
  ])
  const wallets = await db.wallets.orderBy('sort').toArray()
  const categories = await db.categories.toArray()
  const byName = (name: string, kind: 'expense' | 'income') => {
    const found = categories.find((c) => c.name === name && c.kind === kind)
    if (!found) throw new Error(`kategori ${name} tidak ada`)
    return found.id
  }
  const [bca, tunai] = wallets
  if (!bca || !tunai) throw new Error('dompet tidak ada')
  return { bca: bca.id, tunai: tunai.id, makanan: byName('Makanan', 'expense'), gaji: byName('Gaji', 'income'), kopi: byName('Minuman/Kopi', 'expense') }
}

async function pressKeys(scope: HTMLElement, keys: string[]) {
  const user = userEvent.setup()
  for (const key of keys) await user.click(within(scope).getByRole('button', { name: key }))
}

beforeEach(() => {
  useAddSheet.getState().close()
  // Data contoh memakai November 2026; periode dikunci supaya tes tidak bergantung pada tanggal hari ini.
  usePeriod.setState({ period: monthPeriod('2026-11') })
})

afterEach(async () => {
  await db.delete()
  await db.open()
})

describe('tambah transaksi', () => {
  it('mencatat pengeluaran dalam 4 ketukan dari Beranda: tambah, jumlah, kategori, simpan', async () => {
    const { bca, makanan } = await seed()
    const user = userEvent.setup()
    renderAt('/')

    await user.click(await screen.findByRole('button', { name: 'Tambah transaksi' }))
    const sheet = await screen.findByRole('dialog', { name: 'Tambah transaksi' })
    await pressKeys(sheet, ['2', '5', '000'])
    await user.click(within(sheet).getByRole('radio', { name: 'Makanan' }))
    await user.click(within(sheet).getByRole('button', { name: 'Simpan transaksi' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Transaksi disimpan.')).toBeInTheDocument()
    const [tx] = await db.transactions.toArray()
    expect(tx).toMatchObject({ type: 'expense', amount: 25_000, walletId: bca, categoryId: makanan, date: todayDateString() })
  })

  it('memberi tahu apa yang kurang bila belum lengkap', async () => {
    await seed()
    const user = userEvent.setup()
    renderAt('/')
    await user.click(await screen.findByRole('button', { name: 'Tambah transaksi' }))
    const sheet = await screen.findByRole('dialog', { name: 'Tambah transaksi' })
    await user.click(within(sheet).getByRole('button', { name: 'Simpan transaksi' }))
    expect(await within(sheet).findByRole('alert')).toHaveTextContent('Isi jumlah lebih dari Rp0.')
    await pressKeys(sheet, ['5', '000'])
    await user.click(within(sheet).getByRole('button', { name: 'Simpan transaksi' }))
    expect(await within(sheet).findByRole('alert')).toHaveTextContent('Pilih kategori.')
    expect(await db.transactions.count()).toBe(0)
  })

  it('mencatat pemasukan dengan tanggal dan catatan pilihan', async () => {
    const { gaji } = await seed()
    const user = userEvent.setup()
    renderAt('/')
    await user.click(await screen.findByRole('button', { name: 'Tambah transaksi' }))
    const sheet = await screen.findByRole('dialog', { name: 'Tambah transaksi' })
    await user.click(within(sheet).getByRole('radio', { name: 'Pemasukan' }))
    expect(within(sheet).queryByRole('radio', { name: 'Makanan' })).not.toBeInTheDocument()
    await pressKeys(sheet, ['3', '000', '000'])
    await user.click(within(sheet).getByRole('radio', { name: 'Gaji' }))
    fireEvent.change(within(sheet).getByLabelText('Tanggal transaksi'), { target: { value: '2026-11-01' } })

    await user.click(within(sheet).getByRole('button', { name: 'Tambah catatan' }))
    const noteSheet = screen.getByRole('dialog', { name: 'Catatan' })
    await user.type(within(noteSheet).getByLabelText('Catatan'), 'Gaji November')
    await user.click(within(noteSheet).getByRole('button', { name: 'Simpan catatan' }))

    await user.click(within(sheet).getByRole('button', { name: 'Simpan transaksi' }))
    await waitFor(async () => expect(await db.transactions.count()).toBe(1))
    expect((await db.transactions.toArray())[0]).toMatchObject({
      type: 'income',
      amount: 3_000_000,
      categoryId: gaji,
      date: '2026-11-01',
      note: 'Gaji November',
    })
  })

  it('transfer dengan biaya admin menyimpan transfer dan pengeluaran Biaya Admin', async () => {
    const { bca, tunai } = await seed()
    const user = userEvent.setup()
    renderAt('/')
    await user.click(await screen.findByRole('button', { name: 'Tambah transaksi' }))
    const sheet = await screen.findByRole('dialog', { name: 'Tambah transaksi' })
    await user.click(within(sheet).getByRole('radio', { name: 'Transfer' }))
    await pressKeys(sheet, ['5', '0', '0', '000'])
    expect(within(sheet).getByRole('button', { name: /Dompet asal: MyBCA/ })).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: /Dompet tujuan: Tunai/ })).toBeInTheDocument()

    await user.click(within(sheet).getByRole('button', { name: /Biaya admin: Rp0/ }))
    const feeSheet = screen.getByRole('dialog', { name: 'Biaya admin' })
    await pressKeys(feeSheet, ['6', '5', '0', '0'])
    await user.click(within(feeSheet).getByRole('button', { name: 'Simpan' }))

    await user.click(within(sheet).getByRole('button', { name: 'Simpan transaksi' }))
    expect(await screen.findByText('Transfer dan biaya admin disimpan.')).toBeInTheDocument()
    const txs = await db.transactions.toArray()
    expect(txs).toHaveLength(2)
    expect(txs.find((t) => t.type === 'transfer')).toMatchObject({ amount: 500_000, fromWalletId: bca, toWalletId: tunai })
    expect(txs.find((t) => t.type === 'expense')).toMatchObject({ amount: 6_500, walletId: bca })
  })

  it('dompet tujuan tidak bisa sama dengan dompet asal', async () => {
    await seed()
    const user = userEvent.setup()
    renderAt('/')
    await user.click(await screen.findByRole('button', { name: 'Tambah transaksi' }))
    const sheet = await screen.findByRole('dialog', { name: 'Tambah transaksi' })
    await user.click(within(sheet).getByRole('radio', { name: 'Transfer' }))
    await user.click(within(sheet).getByRole('button', { name: /Dompet tujuan/ }))
    const picker = screen.getByRole('dialog', { name: 'Dompet tujuan' })
    expect(within(picker).getByRole('radio', { name: /MyBCA/ })).toBeDisabled()
  })
})

describe('ubah dan hapus dari Riwayat', () => {
  it('mengubah jumlah transaksi', async () => {
    const { bca, makanan } = await seed()
    const { id } = await addTransaction({ type: 'expense', amount: 25_000, date: '2026-11-20', walletId: bca, categoryId: makanan })
    const user = userEvent.setup()
    renderAt('/riwayat')

    await user.click(await screen.findByRole('button', { name: /Pengeluaran Makanan, Rp25\.000/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Ubah transaksi' })
    expect(within(sheet).getByLabelText('Jumlah')).toHaveTextContent('Rp25.000')
    await user.click(within(sheet).getByRole('button', { name: 'Hapus satu digit' }))
    await pressKeys(sheet, ['0', '0'])
    await user.click(within(sheet).getByRole('button', { name: 'Simpan perubahan' }))

    await waitFor(async () => expect((await db.transactions.get(id))?.amount).toBe(250_000))
    expect(await screen.findByRole('button', { name: /Pengeluaran Makanan, Rp250\.000/ })).toBeInTheDocument()
  })

  it('menghapus dengan konfirmasi lalu mengurungkan lewat snackbar', async () => {
    const { bca, makanan } = await seed()
    const { id } = await addTransaction({ type: 'expense', amount: 25_000, date: '2026-11-20', walletId: bca, categoryId: makanan, note: 'Nasi padang' })
    const before = await db.transactions.get(id)
    const user = userEvent.setup()
    renderAt('/riwayat')

    await user.click(await screen.findByRole('button', { name: /Nasi padang/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Ubah transaksi' })
    await user.click(within(sheet).getByRole('button', { name: 'Hapus transaksi' }))
    const confirm = screen.getByRole('alertdialog', { name: 'Hapus transaksi ini?' })
    await user.click(within(confirm).getByRole('button', { name: 'Hapus transaksi' }))

    await waitFor(async () => expect(await db.transactions.count()).toBe(0))
    expect(await screen.findByText('Transaksi dihapus.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Urungkan' }))
    await waitFor(async () => expect(await db.transactions.get(id)).toEqual(before))
  })

  it('membatalkan konfirmasi tidak menghapus apa pun', async () => {
    const { bca, makanan } = await seed()
    await addTransaction({ type: 'expense', amount: 25_000, date: '2026-11-20', walletId: bca, categoryId: makanan })
    const user = userEvent.setup()
    renderAt('/riwayat')
    await user.click(await screen.findByRole('button', { name: /Pengeluaran Makanan/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Ubah transaksi' })
    await user.click(within(sheet).getByRole('button', { name: 'Hapus transaksi' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Batal' }))
    expect(await db.transactions.count()).toBe(1)
  })
})

describe('Riwayat', () => {
  it('mengelompokkan per tanggal dengan selisih harian, transfer tidak dihitung', async () => {
    const { bca, tunai, makanan, gaji } = await seed()
    await addTransaction({ type: 'expense', amount: 20_000, date: '2026-11-20', walletId: bca, categoryId: makanan })
    await addTransaction({ type: 'income', amount: 50_000, date: '2026-11-20', walletId: bca, categoryId: gaji })
    await addTransaction({ type: 'transfer', amount: 100_000, date: '2026-11-20', fromWalletId: bca, toWalletId: tunai })
    await addTransaction({ type: 'expense', amount: 5_000, date: '2026-11-18', walletId: tunai, categoryId: makanan })
    renderAt('/riwayat')

    const day20 = await screen.findByRole('region', { name: '20 Nov 2026' })
    expect(within(day20).getByRole('heading')).toHaveTextContent('20 Nov 2026+Rp30.000')
    expect(within(day20).getAllByRole('listitem')).toHaveLength(3)
    expect(within(day20).getByText('MyBCA → Tunai')).toBeInTheDocument()
    const day18 = screen.getByRole('region', { name: '18 Nov 2026' })
    expect(within(day18).getByRole('heading')).toHaveTextContent('-Rp5.000')
  })

  it('mencari catatan dan menyaring dompet serta kategori', async () => {
    const { bca, tunai, makanan, kopi } = await seed()
    await addTransaction({ type: 'expense', amount: 20_000, date: '2026-11-20', walletId: bca, categoryId: makanan, note: 'Nasi padang' })
    await addTransaction({ type: 'expense', amount: 18_000, date: '2026-11-20', walletId: tunai, categoryId: kopi, note: 'Kopi susu' })
    const user = userEvent.setup()
    renderAt('/riwayat')

    await user.type(await screen.findByRole('searchbox', { name: 'Cari catatan atau kategori' }), 'padang')
    expect(screen.getByText('1 transaksi cocok')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Kopi susu/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Hapus filter' }))
    await user.click(screen.getByRole('button', { name: 'Saring dompet: Semua dompet' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Saring dompet' })).getByRole('radio', { name: /Tunai/ }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Saring dompet: Tunai' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kopi susu/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Nasi padang/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Saring kategori: Semua kategori' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Saring kategori' })).getByRole('radio', { name: /Makanan/ }))
    expect(screen.getByText('Tidak ada transaksi yang cocok')).toBeInTheDocument()

    // Memilih "Semua dompet" lagi melepas filter dompet saja.
    await user.click(screen.getByRole('button', { name: 'Saring dompet: Tunai' }))
    const walletSheet = screen.getByRole('dialog', { name: 'Saring dompet' })
    expect(within(walletSheet).getByRole('radio', { name: /Tunai/ })).toHaveAttribute('aria-checked', 'true')
    await user.click(within(walletSheet).getByRole('radio', { name: 'Semua dompet' }))
    expect(screen.getByRole('button', { name: 'Saring kategori: Makanan' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nasi padang/ })).toBeInTheDocument()
  })

  it('memuat transaksi bertahap', async () => {
    const { bca, makanan } = await seed()
    const total = HISTORY_PAGE_SIZE + 30
    await db.transactions.bulkAdd(
      Array.from({ length: total }, (_, i) => ({
        id: `t${i}`,
        type: 'expense' as const,
        amount: 1_000 + i,
        date: '2026-11-20',
        walletId: bca,
        categoryId: makanan,
        createdAt: i,
        updatedAt: i,
      })),
    )
    const user = userEvent.setup()
    renderAt('/riwayat')
    const loadMore = await screen.findByRole('button', { name: 'Muat 30 transaksi lagi' })
    expect(screen.getAllByRole('button', { name: /Pengeluaran Makanan/ })).toHaveLength(HISTORY_PAGE_SIZE)
    await user.click(loadMore)
    expect(screen.getAllByRole('button', { name: /Pengeluaran Makanan/ })).toHaveLength(total)
    expect(screen.queryByRole('button', { name: /transaksi lagi/ })).not.toBeInTheDocument()
  })
})
