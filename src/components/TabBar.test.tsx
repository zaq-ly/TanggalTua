import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '../routes/routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

describe('TabBar', () => {
  it('menampilkan empat tab dan tombol tambah', () => {
    renderAt('/')
    expect(screen.getByRole('navigation', { name: 'Navigasi utama' })).toBeInTheDocument()
    for (const label of ['Beranda', 'Riwayat', 'Anggaran', 'Statistik']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Tambah transaksi' })).toBeInTheDocument()
  })

  it('berpindah halaman dan menandai tab aktif', async () => {
    const user = userEvent.setup()
    const router = renderAt('/')
    await user.click(screen.getByRole('link', { name: 'Statistik' }))
    expect(router.state.location.pathname).toBe('/statistik')
    expect(screen.getByRole('heading', { level: 1, name: 'Statistik' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Statistik' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Beranda' })).not.toHaveAttribute('aria-current')
  })

  it('tombol tambah membuka lembar dalam satu ketukan dan Escape menutupnya', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: 'Tambah transaksi' }))
    expect(screen.getByRole('dialog', { name: 'Tambah transaksi' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('alamat yang tidak dikenal menampilkan halaman tidak ditemukan', () => {
    renderAt('/tidak-ada')
    expect(screen.getByText('Halaman tidak ditemukan')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Buka Beranda' })).toHaveAttribute('href', '/')
  })
})
