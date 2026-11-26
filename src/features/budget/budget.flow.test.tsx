import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { usePeriod } from '../../components/usePeriod'
import { applyTemplate, createPot, setTotalFund } from '../../db/budgets'
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

async function pressKeys(scope: HTMLElement, keys: string[]) {
  const user = userEvent.setup()
  for (const key of keys) await user.click(within(scope).getByRole('button', { name: key }))
}

async function seed() {
  await completeOnboarding([{ name: 'MyBCA', icon: 'landmark', color: 'blue', startBalance: 5_000_000 }])
  const wallet = (await db.wallets.toArray())[0]
  const categories = await db.categories.toArray()
  const id = (name: string) => categories.find((c) => c.name === name && c.kind === 'expense')?.id ?? ''
  return { wallet: wallet?.id ?? '', makanan: id('Makanan'), kopi: id('Minuman/Kopi') }
}

async function potsOf(month: string) {
  const budget = await db.budgets.where('month').equals(month).first()
  return budget ? db.budgetPots.where('budgetId').equals(budget.id).sortBy('sort') : []
}

beforeEach(() => {
  useAddSheet.getState().close()
  usePeriod.setState({ period: monthPeriod('2026-11') })
})

afterEach(async () => {
  await db.delete()
  await db.open()
})

describe('halaman Anggaran', () => {
  it('mengisi total dana lalu memakai template 50/30/20', async () => {
    await seed()
    const user = userEvent.setup()
    renderAt('/anggaran')

    expect(await screen.findByRole('button', { name: /Pakai template 50\/30\/20\s*Isi total dana dulu/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Total dana November 2026: Rp0/ }))
    const sheet = screen.getByRole('dialog', { name: 'Total dana November 2026' })
    await pressKeys(sheet, ['2', '000', '000'])
    await user.click(within(sheet).getByRole('button', { name: 'Simpan' }))

    const templateButton = await screen.findByRole('button', { name: /Pakai template 50\/30\/20/ })
    await waitFor(() => expect(templateButton).toBeEnabled())
    await user.click(templateButton)
    expect(await screen.findByRole('link', { name: /Pos Kebutuhan: jatah Rp1\.000\.000/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pos Keinginan: jatah Rp600\.000/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pos Tabungan: jatah Rp400\.000/ })).toBeInTheDocument()
    const fund = screen.getByRole('region', { name: 'Total dana' })
    expect(within(fund).getByText('Belum dialokasikan').nextElementSibling).toHaveTextContent('Rp0')
  })

  it('pengeluaran kategori terkait mengurangi sisa pos, warna berubah saat hampir habis dan berlebih', async () => {
    const { wallet, makanan } = await seed()
    await setTotalFund('2026-11', 1_000_000)
    const pot = await createPot('2026-11', { name: 'Makan', icon: 'utensils', color: 'orange', amount: 500_000 })
    await db.categories.update(makanan, { budgetPotId: pot })
    await addTransaction({ type: 'expense', amount: 420_000, date: '2026-11-10', walletId: wallet, categoryId: makanan })
    // Pengeluaran bulan lain tidak dihitung.
    await addTransaction({ type: 'expense', amount: 999_000, date: '2026-10-10', walletId: wallet, categoryId: makanan })
    renderAt('/anggaran')

    const card = await screen.findByRole('link', { name: /Pos Makan: jatah Rp500\.000, terpakai Rp420\.000, sisa Rp80\.000/ })
    expect(within(card).getByText('Sisa Rp80.000')).toHaveClass('text-warning')
    expect(within(card).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '84')

    await addTransaction({ type: 'expense', amount: 100_000, date: '2026-11-11', walletId: wallet, categoryId: makanan })
    const over = await screen.findByRole('link', { name: /lebih Rp20\.000/ })
    expect(within(over).getByText('Lebih Rp20.000')).toHaveClass('text-expense')
  })

  it('memperingatkan bila pos melebihi total dana', async () => {
    await seed()
    await setTotalFund('2026-11', 1_000_000)
    await createPot('2026-11', { name: 'Kebutuhan', icon: 'house', color: 'teal', amount: 1_200_000 })
    renderAt('/anggaran')
    expect(await screen.findByRole('alert')).toHaveTextContent('Pos melebihi total dana sebesar Rp200.000.')
  })

  it('menyalin pos dari bulan lalu', async () => {
    await seed()
    await setTotalFund('2026-10', 3_000_000)
    await applyTemplate('2026-10', '50-30-20')
    const user = userEvent.setup()
    renderAt('/anggaran')
    await user.click(await screen.findByRole('button', { name: 'Salin dari Oktober 2026' }))
    expect(await screen.findByRole('link', { name: /Pos Kebutuhan: jatah Rp1\.500\.000/ })).toBeInTheDocument()
    const [oct, nov] = [await potsOf('2026-10'), await potsOf('2026-11')]
    expect(nov.map((p) => p.key)).toEqual(oct.map((p) => p.key))
  })
})

describe('form pos', () => {
  it('membuat pos dengan persen dan mengaitkan kategori', async () => {
    const { makanan, kopi } = await seed()
    await setTotalFund('2026-11', 2_000_000)
    const user = userEvent.setup()
    const router = renderAt('/anggaran/pos/baru?bulan=2026-11')

    await user.type(await screen.findByLabelText('Nama pos'), 'Jajan')
    await user.click(screen.getByRole('button', { name: /Jatah dalam persen/ }))
    const sheet = screen.getByRole('dialog', { name: 'Jatah dalam persen' })
    await pressKeys(sheet, ['1', '5'])
    expect(within(sheet).getByText('Rp300.000 dari Rp2.000.000')).toBeInTheDocument()
    await user.click(within(sheet).getByRole('button', { name: 'Simpan' }))
    expect(screen.getByRole('button', { name: /Jatah dalam rupiah: Rp300\.000/ })).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: /Makanan/ }))
    await user.click(screen.getByRole('checkbox', { name: /Minuman\/Kopi/ }))
    expect(screen.queryByText('Sudah disisihkan')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Simpan pos' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/anggaran'))
    const [pot] = await potsOf('2026-11')
    expect(pot).toMatchObject({ name: 'Jajan', amount: 300_000 })
    expect((await db.categories.get(makanan))?.budgetPotId).toBe(pot?.key)
    expect((await db.categories.get(kopi))?.budgetPotId).toBe(pot?.key)
  })

  it('pos tanpa kategori bisa ditandai sudah disisihkan penuh', async () => {
    await seed()
    await setTotalFund('2026-11', 2_000_000)
    const id = await createPot('2026-11', { name: 'Tabungan', icon: 'piggy-bank', color: 'indigo', amount: 400_000 })
    const user = userEvent.setup()
    renderAt(`/anggaran/pos/${id}`)
    await user.click(await screen.findByRole('button', { name: 'Tandai sudah disisihkan penuh' }))
    expect(screen.getByRole('button', { name: /Sudah disisihkan: Rp400\.000/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Simpan perubahan' }))
    await waitFor(async () => expect((await db.budgetPots.get(id))?.manualUsed).toBe(400_000))
    expect(await screen.findByRole('link', { name: /Pos Tabungan: jatah Rp400\.000, terpakai Rp400\.000, sisa Rp0/ })).toBeInTheDocument()
  })

  it('menghapus pos setelah konfirmasi', async () => {
    await seed()
    const id = await createPot('2026-11', { name: 'Hobi', icon: 'bike', color: 'green', amount: 100_000 })
    const user = userEvent.setup()
    const router = renderAt(`/anggaran/pos/${id}`)
    await user.click(await screen.findByRole('button', { name: 'Hapus pos' }))
    const confirm = screen.getByRole('alertdialog', { name: 'Hapus pos Hobi?' })
    await user.click(within(confirm).getByRole('button', { name: 'Hapus pos' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/anggaran'))
    expect(await db.budgetPots.count()).toBe(0)
  })
})

describe('onboarding langkah anggaran', () => {
  it('menyimpan total dana bulan ini dengan template', async () => {
    const user = userEvent.setup()
    usePeriod.setState({ period: monthPeriod('2026-11') })
    renderAt('/mulai')
    await user.click(await screen.findByRole('button', { name: 'Lanjut' }))
    await user.click(screen.getByRole('button', { name: 'Lanjut' }))
    expect(screen.getByRole('button', { name: 'Simpan dan mulai' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /Total dana .*: Rp0/ }))
    const sheet = screen.getByRole('dialog', { name: /Total dana/ })
    await pressKeys(sheet, ['3', '000', '000'])
    await user.click(within(sheet).getByRole('button', { name: 'Simpan' }))
    await user.click(screen.getByRole('button', { name: 'Simpan dan mulai' }))

    await waitFor(async () => expect(await db.budgetPots.count()).toBe(3))
    const budget = await db.budgets.toArray()
    expect(budget.map((b) => b.totalFund)).toEqual([3_000_000])
  })
})
