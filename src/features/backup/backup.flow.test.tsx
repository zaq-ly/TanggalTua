import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePeriod } from '../../components/usePeriod'
import { exportBackup } from '../../db/backup'
import { db, getSettings } from '../../db/db'
import { completeOnboarding } from '../../db/onboarding'
import { SCHEMA_VERSION } from '../../db/schema'
import { addTransaction } from '../../db/transactions'
import { parseBackup, type Backup } from '../../domain/backup'
import { monthPeriod } from '../../domain/period'
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
  await addTransaction({ type: 'expense', amount: 25_000, date: '2026-11-20', walletId: wallet, categoryId: makanan, note: 'Nasi, padang' })
  await addTransaction({ type: 'expense', amount: 9_000, date: '2026-10-02', walletId: wallet, categoryId: makanan })
  return { wallet, makanan }
}

/** jsdom tidak punya URL.createObjectURL; blob yang "diunduh" ditangkap di sini. */
const downloads: { name: string; blob: Blob }[] = []

beforeEach(() => {
  useAddSheet.getState().close()
  usePeriod.setState({ period: monthPeriod('2026-11') })
  downloads.length = 0
  let lastBlob: Blob | null = null
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: (blob: Blob) => {
      lastBlob = blob
      return 'blob:tes'
    },
    revokeObjectURL: () => {},
  }))
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    if (lastBlob) downloads.push({ name: this.download, blob: lastBlob })
  })
})

afterEach(async () => {
  vi.restoreAllMocks()
  await db.delete()
  await db.open()
})

function backupFile(backup: Backup | Record<string, unknown>, name = 'cadangan.json') {
  return new File([JSON.stringify(backup)], name, { type: 'application/json' })
}

describe('ekspor', () => {
  it('mengingatkan bila belum pernah dicadangkan, lalu mengunduh cadangan dan mencatat tanggalnya', async () => {
    await seed()
    const user = userEvent.setup()
    renderAt('/pengaturan')
    expect(await screen.findByText('Belum pernah dicadangkan.')).toBeInTheDocument()
    expect(screen.getByText(/Data hanya tersimpan di HP ini/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Ekspor cadangan \(JSON\)/ }))
    await waitFor(() => expect(downloads).toHaveLength(1))
    const [file] = downloads
    expect(file?.name).toMatch(/^keuangan-zaq-cadangan-\d{4}-\d{2}-\d{2}\.json$/)
    const parsed = parseBackup(await (file?.blob.text() ?? Promise.resolve('')), SCHEMA_VERSION)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.backup.data.transactions).toHaveLength(2)

    expect(await screen.findByText(/^Terakhir dicadangkan /)).toBeInTheDocument()
    expect(screen.queryByText(/Data hanya tersimpan di HP ini/)).not.toBeInTheDocument()
    expect((await getSettings()).lastBackupAt).toBeTypeOf('number')
  })

  it('CSV mengikuti periode terpilih', async () => {
    await seed()
    const user = userEvent.setup()
    renderAt('/pengaturan')
    await user.click(await screen.findByRole('button', { name: 'Ekspor CSV November 2026' }))
    await waitFor(() => expect(downloads).toHaveLength(1))
    expect(downloads[0]?.name).toBe('keuangan-zaq-transaksi-2026-11.csv')
    const blob = downloads[0]?.blob ?? new Blob()
    // File diawali BOM UTF-8; Blob.text() sudah membuangnya saat membaca.
    expect([...new Uint8Array(await blob.arrayBuffer()).slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    const lines = (await blob.text()).trimEnd().split('\r\n')
    expect(lines).toEqual([
      'Tanggal,Jenis,Jumlah,Kategori,Dompet,Dompet tujuan,Catatan',
      '2026-11-20,Pengeluaran,25000,Makanan,MyBCA,,"Nasi, padang"',
    ])
  })
})

describe('impor', () => {
  it('menampilkan pratinjau, lalu mengganti semua data setelah dikonfirmasi', async () => {
    await seed()
    const backup = await exportBackup(new Date('2026-11-26T03:00:00Z'))
    // Data berubah setelah cadangan dibuat; impor harus mengembalikannya.
    await db.transactions.clear()
    await db.wallets.add({ id: 'baru', name: 'GoPay', icon: 'wallet', color: 'green', startBalance: 0, archived: false, sort: 9 })

    const user = userEvent.setup()
    const router = renderAt('/pengaturan')
    await user.upload(await screen.findByLabelText('Pilih file cadangan'), backupFile(backup))

    const sheet = await screen.findByRole('alertdialog', { name: 'Pratinjau impor' })
    const rows = within(sheet).getAllByRole('row')
    expect(rows.find((r) => r.textContent?.startsWith('Transaksi'))).toHaveTextContent('Transaksi20')
    expect(rows.find((r) => r.textContent?.startsWith('Dompet'))).toHaveTextContent('Dompet12')

    await user.click(within(sheet).getByRole('button', { name: 'Ganti semua data' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await screen.findByText('Data dari cadangan sudah dipulihkan.')).toBeInTheDocument()
    expect(await db.transactions.count()).toBe(2)
    expect(await db.wallets.get('baru')).toBeUndefined()
  })

  it('membatalkan pratinjau tidak mengubah apa pun', async () => {
    await seed()
    const backup = await exportBackup()
    await db.transactions.clear()
    const user = userEvent.setup()
    renderAt('/pengaturan')
    await user.upload(await screen.findByLabelText('Pilih file cadangan'), backupFile(backup))
    const sheet = await screen.findByRole('alertdialog', { name: 'Pratinjau impor' })
    await user.click(within(sheet).getByRole('button', { name: 'Batal' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(await db.transactions.count()).toBe(0)
  })

  it('menolak cadangan dengan versi skema berbeda tanpa menyentuh data', async () => {
    await seed()
    const backup = await exportBackup()
    const user = userEvent.setup()
    renderAt('/pengaturan')
    await user.upload(await screen.findByLabelText('Pilih file cadangan'), backupFile({ ...backup, schemaVersion: SCHEMA_VERSION - 1 }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/versi aplikasi yang lebih lama/)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(await db.transactions.count()).toBe(2)
  })

  it('menolak file yang bukan cadangan', async () => {
    await seed()
    const user = userEvent.setup()
    renderAt('/pengaturan')
    await user.upload(await screen.findByLabelText('Pilih file cadangan'), new File(['halo'], 'catatan.json', { type: 'application/json' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('File ini bukan cadangan Keuangan Zaq.')
  })
})
