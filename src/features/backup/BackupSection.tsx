import { useLiveQuery } from 'dexie-react-hooks'
import { Download, FileSpreadsheet, Share2, TriangleAlert, Upload } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../components/Button'
import { PeriodPicker } from '../../components/PeriodPicker'
import { usePeriod } from '../../components/usePeriod'
import { useSnackbar } from '../../components/useSnackbar'
import { currentData, exportBackup, replaceWithBackup } from '../../db/backup'
import { db, getSettings } from '../../db/db'
import { messageOf } from '../../db/errors'
import { SCHEMA_VERSION } from '../../db/schema'
import { parseBackup, type Backup } from '../../domain/backup'
import { transactionsCsv } from '../../domain/csvExport'
import { periodLabel, periodRange } from '../../domain/period'
import { canShareFiles, downloadTextFile, shareTextFile } from '../../lib/download'
import { CSV_MIME, JSON_MIME, backupFilename, csvFilename, formatTimestamp, isBackupStale } from './backupFiles'
import { ImportPreviewSheet } from './ImportPreviewSheet'

export function BackupSection() {
  const navigate = useNavigate()
  const showSnackbar = useSnackbar((s) => s.show)
  const period = usePeriod((s) => s.period)
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Backup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [shareSupported] = useState(canShareFiles)

  const data = useLiveQuery(async () => {
    const [settings, current] = await Promise.all([getSettings(), currentData()])
    // Dihitung di sini, bukan saat render, supaya render tetap murni.
    return { settings, current, stale: isBackupStale(settings.lastBackupAt, Date.now()) }
  })
  const lastBackupAt = data?.settings.lastBackupAt
  const hasData = (data?.current.transactions.length ?? 0) > 0
  const stale = data?.stale ?? false

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(false)
    }
  }

  async function exportJson(share: boolean) {
    const backup = await exportBackup()
    const text = JSON.stringify(backup, null, 2)
    const name = backupFilename(backup)
    if (share) {
      const shared = await shareTextFile(name, text, JSON_MIME, 'Cadangan Keuangan Zaq')
      if (shared) showSnackbar('Cadangan dibagikan.')
    } else {
      downloadTextFile(name, text, JSON_MIME)
      showSnackbar(`Cadangan disimpan sebagai ${name}.`)
    }
  }

  async function exportCsv() {
    const [transactions, wallets, categories] = await Promise.all([
      db.transactions.toArray(),
      db.wallets.toArray(),
      db.categories.toArray(),
    ])
    const name = csvFilename(period)
    downloadTextFile(name, transactionsCsv(transactions, wallets, categories, periodRange(period)), CSV_MIME)
    showSnackbar(`CSV disimpan sebagai ${name}.`)
  }

  async function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    const result = parseBackup(await file.text(), SCHEMA_VERSION)
    if (result.ok) setPending(result.backup)
    else setError(result.error)
  }

  return (
    <section aria-labelledby="judul-cadangan" className="flex flex-col gap-3">
      <h2 id="judul-cadangan" className="px-1 font-semibold">
        Cadangan data
      </h2>

      <div className="flex flex-col gap-3 rounded-card bg-surface px-4 py-4">
        <p className="min-h-5 text-sm" aria-live="polite">
          {data && (lastBackupAt === undefined ? 'Belum pernah dicadangkan.' : `Terakhir dicadangkan ${formatTimestamp(lastBackupAt)}.`)}
        </p>
        {data && stale && hasData && (
          <p className="flex items-start gap-2 rounded-control bg-surface-2 px-3 py-2 text-sm">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
            {lastBackupAt === undefined
              ? 'Data hanya tersimpan di HP ini. Ekspor cadangan supaya tidak hilang kalau HP rusak atau ganti.'
              : 'Sudah lebih dari 30 hari sejak cadangan terakhir. Ekspor lagi supaya transaksi terbaru ikut aman.'}
          </p>
        )}
        <Button block disabled={busy} onClick={() => void run(() => exportJson(false))}>
          <Download aria-hidden="true" className="size-5" />
          Ekspor cadangan (JSON)
        </Button>
        {shareSupported && (
          <Button variant="secondary" block disabled={busy} onClick={() => void run(() => exportJson(true))}>
            <Share2 aria-hidden="true" className="size-5" />
            Bagikan cadangan ke Drive atau aplikasi lain
          </Button>
        )}
        <Button variant="secondary" block disabled={busy} onClick={() => fileInput.current?.click()}>
          <Upload aria-hidden="true" className="size-5" />
          Impor cadangan
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          aria-label="Pilih file cadangan"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => void pickFile(e)}
        />
        {error && (
          <p role="alert" className="text-sm text-expense">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-card bg-surface px-4 py-4">
        <div>
          <p className="font-medium">Ekspor transaksi ke CSV</p>
          <p className="text-sm text-muted">Untuk dibuka di Google Sheets. Mengikuti periode yang dipilih.</p>
        </div>
        <PeriodPicker />
        <Button variant="secondary" block disabled={busy} onClick={() => void run(exportCsv)}>
          <FileSpreadsheet aria-hidden="true" className="size-5" />
          Ekspor CSV {periodLabel(period)}
        </Button>
      </div>

      <ImportPreviewSheet
        backup={pending}
        current={data?.current}
        onClose={() => setPending(null)}
        onConfirm={async (backup) => {
          await replaceWithBackup(backup)
          setPending(null)
          showSnackbar('Data dari cadangan sudah dipulihkan.')
          navigate('/')
        }}
      />
    </section>
  )
}
