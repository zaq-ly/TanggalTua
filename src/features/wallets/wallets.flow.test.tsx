import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { createWallet } from '../../db/wallets'
import { routes } from '../../routes/routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

afterEach(async () => {
  await db.delete()
  await db.open()
})

describe('onboarding', () => {
  it('Beranda kosong mengarahkan ke pembuatan dompet', async () => {
    renderAt('/')
    expect(await screen.findByRole('link', { name: 'Buat dompet' })).toHaveAttribute('href', '/mulai')
  })

  it('memilih dompet, mengisi saldo awal dengan keypad, lalu menyimpan', async () => {
    const user = userEvent.setup()
    const router = renderAt('/mulai')

    await user.click(await screen.findByRole('checkbox', { name: /BRImo/ }))
    await user.type(screen.getByLabelText('Dompet lain'), 'GoPay')
    await user.click(screen.getByRole('button', { name: 'Tambahkan dompet lain' }))
    await user.click(screen.getByRole('button', { name: 'Lanjut' }))

    await user.click(screen.getByRole('button', { name: /Saldo awal MyBCA/ }))
    const sheet = screen.getByRole('dialog', { name: 'Saldo awal MyBCA' })
    for (const key of ['1', '5', '0', '0', '000']) {
      await user.click(within(sheet).getByRole('button', { name: key }))
    }
    await user.click(within(sheet).getByRole('button', { name: 'Simpan' }))
    expect(screen.getByRole('button', { name: /Saldo awal MyBCA: Rp1\.500\.000/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mulai mencatat' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))

    const wallets = await db.wallets.orderBy('sort').toArray()
    expect(wallets.map((w) => [w.name, w.startBalance])).toEqual([
      ['MyBCA', 1_500_000],
      ['Tunai', 0],
      ['GoPay', 0],
    ])
    expect(await db.categories.count()).toBe(16)
    expect(await screen.findByRole('link', { name: /MyBCA, saldo Rp1\.500\.000/ })).toBeInTheDocument()
  })

  it('tidak bisa lanjut tanpa dompet', async () => {
    const user = userEvent.setup()
    renderAt('/mulai')
    for (const name of ['MyBCA', 'BRImo', 'Tunai']) {
      await user.click(await screen.findByRole('checkbox', { name: new RegExp(name) }))
    }
    expect(screen.getByRole('button', { name: 'Lanjut' })).toBeDisabled()
  })

  it('kembali ke Beranda bila dompet sudah ada', async () => {
    await createWallet({ name: 'Tunai', icon: 'wallet', color: 'green', startBalance: 0 })
    const router = renderAt('/mulai')
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })
})

describe('form dompet', () => {
  it('menampilkan pesan bila nama kembar', async () => {
    await createWallet({ name: 'Tunai', icon: 'wallet', color: 'green', startBalance: 0 })
    const user = userEvent.setup()
    renderAt('/pengaturan/dompet/baru')
    await user.type(await screen.findByLabelText('Nama dompet'), 'tunai')
    await user.click(screen.getByRole('button', { name: 'Simpan dompet' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Sudah ada dompet bernama "tunai". Pakai nama lain.')
  })

  it('mengarsipkan dompet dan memulihkannya dari daftar', async () => {
    const id = await createWallet({ name: 'Tunai', icon: 'wallet', color: 'green', startBalance: 0 })
    const user = userEvent.setup()
    const router = renderAt(`/pengaturan/dompet/${id}`)
    await user.click(await screen.findByRole('button', { name: 'Arsipkan dompet' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/pengaturan/dompet'))
    expect((await db.wallets.get(id))?.archived).toBe(true)

    await user.click(await screen.findByText('Diarsipkan (1)'))
    await user.click(screen.getByRole('button', { name: 'Pulihkan' }))
    await waitFor(async () => expect((await db.wallets.get(id))?.archived).toBe(false))
  })
})

describe('kategori', () => {
  it('memakai kategori bawaan lalu berpindah ke tab pemasukan', async () => {
    const user = userEvent.setup()
    renderAt('/pengaturan/kategori')
    await user.click(await screen.findByRole('button', { name: 'Pakai kategori bawaan' }))
    expect(await screen.findByText('Makanan')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Pemasukan' }))
    expect(await screen.findByText('Gaji')).toBeInTheDocument()
    expect(screen.queryByText('Makanan')).not.toBeInTheDocument()
  })

  it('membuat kategori dengan ikon dan warna pilihan', async () => {
    const user = userEvent.setup()
    const router = renderAt('/pengaturan/kategori/baru?jenis=pengeluaran')
    await user.type(await screen.findByLabelText('Nama kategori'), 'Sparepart')
    await user.click(screen.getByRole('button', { name: 'Ganti ikon' }))
    await user.type(screen.getByRole('searchbox', { name: 'Cari ikon' }), 'bengkel')
    await user.click(screen.getByRole('button', { name: 'servis bengkel sparepart' }))
    await user.click(screen.getByRole('radio', { name: 'Abu-abu' }))
    await user.click(screen.getByRole('button', { name: 'Simpan kategori' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/pengaturan/kategori'))
    const saved = await db.categories.where('kind').equals('expense').first()
    expect(saved).toMatchObject({ name: 'Sparepart', icon: 'wrench', color: 'slate', archived: false })
  })
})
