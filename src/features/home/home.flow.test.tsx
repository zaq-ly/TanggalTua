import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { usePeriod } from '../../components/usePeriod'
import { db } from '../../db/db'
import { completeOnboarding } from '../../db/onboarding'
import { addTransaction } from '../../db/transactions'
import { setWalletArchived } from '../../db/wallets'
import { monthPeriod } from '../../domain/period'
import { routes } from '../../routes/routes'
import { useAddSheet } from '../transactions/useAddSheet'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

async function seed() {
  await completeOnboarding([
    { name: 'MyBCA', icon: 'landmark', color: 'blue', startBalance: 1_000_000 },
    { name: 'Tunai', icon: 'wallet', color: 'green', startBalance: 200_000 },
    { name: 'Lama', icon: 'wallet', color: 'slate', startBalance: 50_000 },
  ])
  const wallets = await db.wallets.orderBy('sort').toArray()
  const categories = await db.categories.toArray()
  const id = (name: string, kind: 'expense' | 'income') => categories.find((c) => c.name === name && c.kind === kind)?.id
  return {
    bca: wallets[0]?.id ?? '',
    tunai: wallets[1]?.id ?? '',
    lama: wallets[2]?.id ?? '',
    makanan: id('Makanan', 'expense') ?? '',
    gaji: id('Gaji', 'income') ?? '',
  }
}

function card(name: RegExp | string) {
  return screen.getByText(name, { selector: 'p' }).closest('div') as HTMLElement
}

beforeEach(() => {
  useAddSheet.getState().close()
  usePeriod.setState({ period: monthPeriod('2026-11') })
})

afterEach(async () => {
  await db.delete()
  await db.open()
})

describe('Beranda', () => {
  it('menampilkan total saldo, saldo per dompet, dan ringkasan periode', async () => {
    const { bca, tunai, makanan, gaji } = await seed()
    await addTransaction({ type: 'income', amount: 3_000_000, date: '2026-11-01', walletId: bca, categoryId: gaji })
    await addTransaction({ type: 'expense', amount: 25_000, date: '2026-11-20', walletId: tunai, categoryId: makanan })
    await addTransaction({ type: 'transfer', amount: 500_000, date: '2026-11-21', fromWalletId: bca, toWalletId: tunai })
    await addTransaction({ type: 'expense', amount: 10_000, date: '2026-10-31', walletId: tunai, categoryId: makanan })
    renderAt('/')

    const total = await screen.findByRole('region', { name: 'Total saldo' })
    // 1.000.000 + 200.000 + 50.000 + 3.000.000 − 25.000 − 10.000; transfer tidak mengubah total.
    expect(within(total).getByText('Rp4.215.000')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /MyBCA, saldo Rp3\.500\.000/ })).toHaveAttribute('href', `/riwayat?dompet=${bca}`)
    expect(screen.getByRole('link', { name: /Tunai, saldo Rp665\.000/ })).toBeInTheDocument()

    expect(within(card('Pemasukan')).getByText('Rp3.000.000')).toBeInTheDocument()
    // Pengeluaran Oktober dan transfer tidak masuk ringkasan November.
    expect(within(card('Pengeluaran')).getByText('Rp25.000')).toBeInTheDocument()
    expect(within(card('Selisih')).getByText('+Rp2.975.000')).toBeInTheDocument()
  })

  it('dompet diarsipkan keluar dari total, kecuali diatur ikut dihitung', async () => {
    const { lama } = await seed()
    await setWalletArchived(lama, true)
    const user = userEvent.setup()
    const router = renderAt('/')
    const total = await screen.findByRole('region', { name: 'Total saldo' })
    expect(within(total).getByText('Rp1.200.000')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Lama, saldo/ })).not.toBeInTheDocument()

    await router.navigate('/pengaturan/dompet')
    await user.click(await screen.findByRole('switch', { name: 'Hitung dompet diarsipkan' }))
    await waitFor(async () => expect((await db.settings.get('main'))?.includeArchivedInTotal).toBe(true))
    await router.navigate('/')
    expect(await screen.findByText('Rp1.250.000')).toBeInTheDocument()
    expect(screen.getByText('2 dompet aktif, termasuk yang diarsipkan')).toBeInTheDocument()
  })

  it('menampilkan 5 transaksi terakhir', async () => {
    const { bca, makanan } = await seed()
    for (let day = 10; day < 16; day++) {
      await addTransaction({ type: 'expense', amount: day * 1_000, date: `2026-11-${day}`, walletId: bca, categoryId: makanan })
    }
    renderAt('/')
    const recent = await screen.findByRole('region', { name: 'Transaksi terakhir' })
    const rows = within(recent).getAllByRole('button', { name: /Pengeluaran Makanan/ })
    expect(rows).toHaveLength(5)
    expect(rows[0]).toHaveAccessibleName(/Rp15\.000/)
    expect(within(recent).queryByRole('button', { name: /Rp10\.000/ })).not.toBeInTheDocument()
  })

  it('mengarahkan ke pencatatan bila belum ada transaksi', async () => {
    await seed()
    const user = userEvent.setup()
    renderAt('/')
    await user.click(await screen.findByRole('button', { name: 'Catat transaksi' }))
    expect(screen.getByRole('dialog', { name: 'Tambah transaksi' })).toBeInTheDocument()
  })

  it('ketuk dompet membuka Riwayat yang tersaring ke dompet itu', async () => {
    const { bca, tunai, makanan } = await seed()
    await addTransaction({ type: 'expense', amount: 11_000, date: '2026-11-20', walletId: bca, categoryId: makanan })
    await addTransaction({ type: 'expense', amount: 22_000, date: '2026-11-20', walletId: tunai, categoryId: makanan })
    const user = userEvent.setup()
    const router = renderAt('/')
    await user.click(await screen.findByRole('link', { name: /Tunai, saldo/ }))
    expect(router.state.location.pathname).toBe('/riwayat')
    expect(await screen.findByRole('combobox', { name: 'Saring dompet' })).toHaveValue(tunai)
    expect(screen.getByRole('button', { name: /Rp22\.000/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Rp11\.000/ })).not.toBeInTheDocument()
  })
})

describe('pemilih periode', () => {
  it('bulan sebelumnya mengubah ringkasan di Beranda dan isi Riwayat', async () => {
    const { tunai, makanan } = await seed()
    await addTransaction({ type: 'expense', amount: 10_000, date: '2026-10-31', walletId: tunai, categoryId: makanan })
    const user = userEvent.setup()
    const router = renderAt('/')

    expect(within(await screen.findByText('Pengeluaran', { selector: 'p' }).then((p) => p.closest('div') as HTMLElement)).getByText('Rp0')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Bulan sebelumnya' }))
    expect(screen.getByRole('button', { name: /Periode: Oktober 2026/ })).toBeInTheDocument()
    expect(within(card('Pengeluaran')).getByText('Rp10.000')).toBeInTheDocument()

    // Periode dipakai bersama: Riwayat ikut Oktober.
    await router.navigate('/riwayat')
    await screen.findByRole('heading', { level: 1, name: 'Riwayat' })
    expect(await screen.findByRole('button', { name: /Rp10\.000/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Bulan berikutnya' }))
    expect(await screen.findByText('Tidak ada transaksi di periode ini')).toBeInTheDocument()
  })

  it('memilih bulan dan rentang tanggal dari lembar periode', async () => {
    const { tunai, makanan } = await seed()
    await addTransaction({ type: 'expense', amount: 7_000, date: '2026-03-15', walletId: tunai, categoryId: makanan })
    await addTransaction({ type: 'expense', amount: 9_000, date: '2026-04-02', walletId: tunai, categoryId: makanan })
    const user = userEvent.setup()
    renderAt('/')

    await user.click(await screen.findByRole('button', { name: /Periode: November 2026/ }))
    let sheet = screen.getByRole('dialog', { name: 'Pilih periode' })
    await user.click(within(sheet).getByRole('button', { name: 'Mar 2026' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(card('Pengeluaran')).getByText('Rp7.000')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Periode: Maret 2026/ }))
    sheet = screen.getByRole('dialog', { name: 'Pilih periode' })
    const from = within(sheet).getByLabelText('Dari')
    const to = within(sheet).getByLabelText('Sampai')
    await user.clear(from)
    await user.type(from, '2026-03-10')
    await user.clear(to)
    await user.type(to, '2026-04-05')
    await user.click(within(sheet).getByRole('button', { name: 'Terapkan rentang' }))
    expect(screen.getByRole('button', { name: /Periode: 10 Mar 2026 – 5 Apr 2026/ })).toBeInTheDocument()
    expect(within(card('Pengeluaran')).getByText('Rp16.000')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bulan sebelumnya' })).toBeDisabled()
  })
})
