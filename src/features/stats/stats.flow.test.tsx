import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { usePeriod } from '../../components/usePeriod'
import { createCategory } from '../../db/categories'
import { db } from '../../db/db'
import { completeOnboarding } from '../../db/onboarding'
import { addTransaction } from '../../db/transactions'
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
    { name: 'MyBCA', icon: 'landmark', color: 'blue', startBalance: 0 },
    { name: 'Tunai', icon: 'wallet', color: 'green', startBalance: 0 },
  ])
  const wallets = await db.wallets.orderBy('sort').toArray()
  const categories = await db.categories.toArray()
  const id = (name: string, kind: 'expense' | 'income') => categories.find((c) => c.name === name && c.kind === kind)?.id ?? ''
  const bca = wallets[0]?.id ?? ''
  const tunai = wallets[1]?.id ?? ''
  await addTransaction({ type: 'expense', amount: 100_000, date: '2026-11-05', walletId: bca, categoryId: id('Makanan', 'expense') })
  await addTransaction({ type: 'expense', amount: 50_000, date: '2026-11-06', walletId: bca, categoryId: id('Minuman/Kopi', 'expense'), note: 'Kopi susu' })
  await addTransaction({ type: 'income', amount: 5_000_000, date: '2026-11-01', walletId: bca, categoryId: id('Gaji', 'income') })
  await addTransaction({ type: 'transfer', amount: 1_000_000, date: '2026-11-02', fromWalletId: bca, toWalletId: tunai })
  await addTransaction({ type: 'expense', amount: 70_000, date: '2026-10-20', walletId: bca, categoryId: id('Makanan', 'expense') })
  return { bca, makanan: id('Makanan', 'expense') }
}

// Halaman Statistik dimuat lazy; impor pertamanya (Recharts) bisa lebih lama dari batas tunggu findBy.
beforeAll(async () => {
  await import('./StatsPage')
})

beforeEach(() => {
  useAddSheet.getState().close()
  usePeriod.setState({ period: monthPeriod('2026-11') })
})

afterEach(async () => {
  await db.delete()
  await db.open()
})

describe('Statistik', () => {
  it('menampilkan total dan rincian pengeluaran per kategori dengan persen yang berjumlah 100%', async () => {
    await seed()
    renderAt('/statistik')
    const list = await screen.findByRole('list', { name: 'Rincian pengeluaran per kategori' })
    const rows = within(list).getAllByRole('link')
    expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual([
      'Makanan: Rp100.000, 66,7%. Lihat transaksinya.',
      'Minuman/Kopi: Rp50.000, 33,3%. Lihat transaksinya.',
    ])
    // Transfer dan pengeluaran Oktober tidak ikut.
    expect(screen.getByText('Rp150.000', { selector: 'p' })).toBeInTheDocument()
  })

  it('tab pemasukan memisahkan pemasukan', async () => {
    await seed()
    const user = userEvent.setup()
    renderAt('/statistik')
    await user.click(await screen.findByRole('tab', { name: 'Pemasukan' }))
    const list = await screen.findByRole('list', { name: 'Rincian pemasukan per kategori' })
    expect(within(list).getAllByRole('link').map((r) => r.getAttribute('aria-label'))).toEqual([
      'Gaji: Rp5.000.000, 100%. Lihat transaksinya.',
    ])
  })

  it('ketuk kategori membuka Riwayat yang tersaring ke kategori itu', async () => {
    const { makanan } = await seed()
    const user = userEvent.setup()
    const router = renderAt('/statistik')
    await user.click(await screen.findByRole('link', { name: /^Makanan:/ }))
    expect(router.state.location.pathname).toBe('/riwayat')
    expect(await screen.findByRole('combobox', { name: 'Saring kategori' })).toHaveValue(makanan)
    expect(await screen.findByRole('button', { name: /Pengeluaran Makanan, Rp100\.000/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Kopi susu/ })).not.toBeInTheDocument()
  })

  it('tabel 6 bulan terakhir berisi pemasukan dan pengeluaran tanpa transfer', async () => {
    await seed()
    const user = userEvent.setup()
    renderAt('/statistik')
    await user.click(await screen.findByText('Lihat dalam tabel'))
    const table = screen.getByRole('table', { name: 'Pemasukan dan pengeluaran per bulan' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(6)
    expect(rows[0]).toHaveTextContent('Juni 2026')
    expect(rows[4]).toHaveTextContent('Oktober 2026Rp0Rp70.000')
    expect(rows[5]).toHaveTextContent('November 2026Rp5.000.000Rp150.000')
  })

  it('periode kosong menampilkan petunjuk', async () => {
    await seed()
    usePeriod.setState({ period: monthPeriod('2026-12') })
    renderAt('/statistik')
    expect(await screen.findByText('Belum ada pengeluaran di periode ini')).toBeInTheDocument()
  })

  it('kategori kecil digabung di donat tetapi tetap lengkap di daftar', async () => {
    const { bca } = await seed()
    for (let i = 0; i < 6; i++) {
      const id = await createCategory('expense', { name: `Ekstra ${i}`, icon: 'tag', color: 'slate' })
      await addTransaction({ type: 'expense', amount: 1_000 + i, date: '2026-11-10', walletId: bca, categoryId: id })
    }
    renderAt('/statistik')
    const list = await screen.findByRole('list', { name: 'Rincian pengeluaran per kategori' })
    expect(within(list).getAllByRole('link')).toHaveLength(8)
    await waitFor(() => expect(screen.getByText(/Kategori lain: 3 kategori terkecil digabung/)).toBeInTheDocument())
  })
})
