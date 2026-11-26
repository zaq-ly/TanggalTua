import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db, getSettings } from '../../db/db'
import { completeOnboarding } from '../../db/onboarding'
import { setTheme, wipeAllData } from '../../db/settings'
import { addTransaction } from '../../db/transactions'
import { readThemePreference } from '../../lib/theme'
import { routes } from '../../routes/routes'
import { useAddSheet } from '../transactions/useAddSheet'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

async function seed() {
  await completeOnboarding([{ name: 'MyBCA', icon: 'landmark', color: 'blue', startBalance: 1_000_000 }])
  const wallet = (await db.wallets.toArray())[0]?.id ?? ''
  const makanan = (await db.categories.toArray()).find((c) => c.name === 'Makanan')?.id ?? ''
  await addTransaction({ type: 'expense', amount: 25_000, date: '2026-11-20', walletId: wallet, categoryId: makanan })
}

beforeEach(() => {
  useAddSheet.getState().close()
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

afterEach(async () => {
  await db.delete()
  await db.open()
})

describe('tema', () => {
  it('memilih tema gelap menerapkannya dan menyimpannya ke database dan localStorage', async () => {
    const user = userEvent.setup()
    renderAt('/pengaturan')
    const group = await screen.findByRole('radiogroup', { name: 'Tampilan' })
    expect(within(group).getByRole('radio', { name: 'Ikuti sistem' })).toHaveAttribute('aria-checked', 'true')

    await user.click(within(group).getByRole('radio', { name: 'Gelap' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(readThemePreference()).toBe('dark')
    await waitFor(async () => expect((await getSettings()).theme).toBe('dark'))
    expect(within(group).getByRole('radio', { name: 'Gelap' })).toHaveAttribute('aria-checked', 'true')

    await user.click(within(group).getByRole('radio', { name: 'Ikuti sistem' }))
    expect(document.documentElement).not.toHaveAttribute('data-theme')
  })

  it('berganti tema cepat tidak membuat tema melompat balik ke pilihan sebelumnya', async () => {
    const user = userEvent.setup()
    renderAt('/pengaturan')
    const group = await screen.findByRole('radiogroup', { name: 'Tampilan' })
    await user.click(within(group).getByRole('radio', { name: 'Gelap' }))

    // Catat setiap perubahan tema setelah pengguna memilih "Ikuti sistem".
    const seen: (string | null)[] = []
    const observer = new MutationObserver(() => seen.push(document.documentElement.getAttribute('data-theme')))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    await user.click(within(group).getByRole('radio', { name: 'Ikuti sistem' }))

    await waitFor(async () => expect((await getSettings()).theme).toBe('system'))
    await waitFor(() => expect(document.documentElement).not.toHaveAttribute('data-theme'))
    await new Promise((r) => setTimeout(r, 50))
    observer.disconnect()
    expect(seen).not.toContain('dark')
    expect(document.documentElement).not.toHaveAttribute('data-theme')
    expect(readThemePreference()).toBe('system')
  })

  it('tema dari database (misalnya hasil impor) langsung diterapkan', async () => {
    await setTheme('light')
    renderAt('/')
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'light'))
    expect(readThemePreference()).toBe('light')
  })
})

describe('hapus semua data', () => {
  it('butuh dua langkah dan kata konfirmasi', async () => {
    await seed()
    await setTheme('dark')
    const user = userEvent.setup()
    const router = renderAt('/pengaturan')

    await user.click(await screen.findByRole('button', { name: 'Hapus semua data' }))
    const first = screen.getByRole('alertdialog', { name: 'Hapus semua data?' })
    await user.click(within(first).getByRole('button', { name: 'Lanjut' }))

    const second = screen.getByRole('alertdialog', { name: 'Konfirmasi terakhir' })
    const confirm = within(second).getByRole('button', { name: 'Hapus semua data' })
    expect(confirm).toBeDisabled()
    await user.type(within(second).getByLabelText(/Ketik HAPUS/), 'hapu')
    expect(confirm).toBeDisabled()
    await user.type(within(second).getByLabelText(/Ketik HAPUS/), 's')
    expect(confirm).toBeEnabled()
    await user.click(confirm)

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await db.transactions.count()).toBe(0)
    expect(await db.wallets.count()).toBe(0)
    expect(await db.categories.count()).toBe(0)
    expect((await getSettings()).theme).toBe('dark')
    expect(await screen.findByRole('link', { name: 'Buat dompet' })).toBeInTheDocument()
  })

  it('membatalkan di langkah mana pun tidak menghapus apa pun', async () => {
    await seed()
    const user = userEvent.setup()
    renderAt('/pengaturan')
    await user.click(await screen.findByRole('button', { name: 'Hapus semua data' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Lanjut' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Batal' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(await db.transactions.count()).toBe(1)
  })

  it('wipeAllData mengembalikan pengaturan bawaan kecuali tema', async () => {
    await seed()
    await setTheme('light')
    await db.settings.update('main', { includeArchivedInTotal: true, lastBackupAt: 5 })
    await wipeAllData()
    expect(await getSettings()).toEqual({ id: 'main', theme: 'light', schemaVersion: 2, includeArchivedInTotal: false })
  })
})

describe('penyimpanan', () => {
  it('memberi tahu bila browser tidak mendukung penyimpanan persisten', async () => {
    renderAt('/pengaturan')
    expect(await screen.findByText(/tidak mendukung penyimpanan persisten/)).toBeInTheDocument()
  })
})
