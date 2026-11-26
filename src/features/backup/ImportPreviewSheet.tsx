import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { Sheet } from '../../components/Sheet'
import { messageOf } from '../../db/errors'
import { backupCounts, type Backup, type BackupData } from '../../domain/backup'
import { formatTimestamp } from './backupFiles'

interface ImportPreviewSheetProps {
  backup: Backup | null
  current: BackupData | undefined
  onConfirm: (backup: Backup) => Promise<void>
  onClose: () => void
}

const ROWS = [
  ['wallets', 'Dompet'],
  ['categories', 'Kategori'],
  ['transactions', 'Transaksi'],
  ['budgets', 'Anggaran bulanan'],
  ['budgetPots', 'Pos anggaran'],
] as const

export function ImportPreviewSheet({ backup, current, onConfirm, onClose }: ImportPreviewSheetProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const incoming = backup ? backupCounts(backup.data) : null
  const existing = current ? backupCounts(current) : null

  async function confirm() {
    if (!backup) return
    setBusy(true)
    setError(null)
    try {
      await onConfirm(backup)
    } catch (e) {
      setError(messageOf(e))
      setBusy(false)
    }
  }

  return (
    <Sheet open={backup !== null} title="Pratinjau impor" onClose={onClose} role="alertdialog">
      {backup && incoming && (
        <div className="flex flex-col gap-4 pb-2">
          <p className="text-muted">Cadangan dibuat {formatTimestamp(Date.parse(backup.exportedAt))}.</p>
          <table className="w-full text-sm tabular-nums">
            <caption className="sr-only">Jumlah data di file cadangan dan di HP ini</caption>
            <thead>
              <tr className="text-left text-muted">
                <th scope="col" className="py-1 font-medium">Data</th>
                <th scope="col" className="py-1 text-right font-medium">Di cadangan</th>
                <th scope="col" className="py-1 text-right font-medium">Di HP ini</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ROWS.map(([key, label]) => (
                <tr key={key}>
                  <th scope="row" className="py-2 text-left font-medium">{label}</th>
                  <td className="py-2 text-right font-semibold">{incoming[key]}</td>
                  <td className="py-2 text-right text-muted">{existing?.[key] ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="flex items-start gap-2 rounded-control bg-surface-2 px-3 py-2 text-sm">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
            Semua data di HP ini akan diganti dengan isi cadangan dan tidak bisa dibatalkan. Ekspor cadangan data sekarang dulu bila
            masih ingin menyimpannya.
          </p>
          {error && (
            <p role="alert" className="text-sm text-expense">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Button variant="danger" block disabled={busy} onClick={() => void confirm()}>
              Ganti semua data
            </Button>
            <Button variant="secondary" block onClick={onClose}>
              Batal
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
