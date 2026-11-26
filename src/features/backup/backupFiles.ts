import type { Backup } from '../../domain/backup'
import type { Period } from '../../domain/period'
import { formatDate, toDateString } from '../../lib/date'

export const JSON_MIME = 'application/json'
export const CSV_MIME = 'text/csv;charset=utf-8'

/** Cadangan lebih tua dari ini dianggap perlu diperbarui (pengingat lembut PRD F8). */
export const BACKUP_REMINDER_DAYS = 30

export function backupFilename(backup: Backup): string {
  return `keuangan-zaq-cadangan-${toDateString(new Date(backup.exportedAt))}.json`
}

export function csvFilename(period: Period): string {
  const part = period.kind === 'month' ? period.month : `${period.start}_${period.end}`
  return `keuangan-zaq-transaksi-${part}.csv`
}

/** `26 Nov 2026, 10.05` waktu lokal. */
export function formatTimestamp(ms: number): string {
  const date = new Date(ms)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${formatDate(toDateString(date))}, ${hh}.${mm}`
}

export function isBackupStale(lastBackupAt: number | undefined, now: number): boolean {
  if (lastBackupAt === undefined) return true
  return now - lastBackupAt > BACKUP_REMINDER_DAYS * 24 * 60 * 60 * 1000
}
