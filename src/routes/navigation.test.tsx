import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { completeOnboarding } from '../db/onboarding'
import { useAddSheet } from '../features/transactions/useAddSheet'
import { routes } from './routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

async function back() {
  await userEvent.setup().click(await screen.findByRole('link', { name: /^Kembali/ }))
}

beforeEach(async () => {
  useAddSheet.getState().close()
  await completeOnboarding([{ name: 'MyBCA', icon: 'landmark', color: 'blue', startBalance: 0 }])
})

afterEach(async () => {
  await db.delete()
  await db.open()
})

describe('tombol kembali', () => {
  it('dari Kelola dompet yang dibuka lewat Beranda kembali ke Beranda', async () => {
    const user = userEvent.setup()
    const router = renderAt('/')
    await user.click(await screen.findByRole('link', { name: 'Kelola' }))
    await screen.findByRole('heading', { level: 1, name: 'Dompet' })
    await back()
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('dari Kelola dompet yang dibuka lewat Pengaturan kembali ke Pengaturan', async () => {
    const user = userEvent.setup()
    const router = renderAt('/pengaturan')
    await user.click(await screen.findByRole('link', { name: /^Dompet/ }))
    await screen.findByRole('heading', { level: 1, name: 'Dompet' })
    await back()
    await waitFor(() => expect(router.state.location.pathname).toBe('/pengaturan'))
  })

  it('setelah menyimpan dompet, kembali dari daftar tetap ke halaman asal, bukan ke form', async () => {
    const user = userEvent.setup()
    const router = renderAt('/')
    await user.click(await screen.findByRole('link', { name: 'Kelola' }))
    await user.click(await screen.findByRole('link', { name: /^MyBCA/ }))
    await user.click(await screen.findByRole('button', { name: 'Simpan perubahan' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/pengaturan/dompet'))
    // Tunggu daftar benar-benar tampil supaya yang diklik tombol kembali milik daftar, bukan milik form.
    await screen.findByRole('heading', { level: 1, name: 'Dompet' })
    await back()
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('tanpa riwayat (dibuka langsung), kembali ke halaman induknya', async () => {
    const router = renderAt('/pengaturan/dompet')
    await back()
    await waitFor(() => expect(router.state.location.pathname).toBe('/pengaturan'))
  })
})
