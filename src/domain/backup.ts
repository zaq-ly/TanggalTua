import type {
  Budget,
  BudgetPot,
  Category,
  Settings,
  Transaction,
  Wallet,
} from '../db/types'
import { isDateString, isMonthString } from '../lib/date'
import { isRupiah } from '../lib/money'
import { validateTransaction } from './transactions'

export const BACKUP_APP_ID = 'keuangan-zaq'

export interface BackupData {
  wallets: Wallet[]
  categories: Category[]
  transactions: Transaction[]
  budgets: Budget[]
  budgetPots: BudgetPot[]
  settings: Settings[]
}

export interface Backup {
  app: typeof BACKUP_APP_ID
  schemaVersion: number
  /** Waktu ekspor, ISO 8601. */
  exportedAt: string
  data: BackupData
}

const TABLES = ['wallets', 'categories', 'transactions', 'budgets', 'budgetPots', 'settings'] as const

function byId<T extends { id: string }>(a: T, b: T): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/** Urutan diurutkan per id supaya file ekspor deterministik dan mudah dibandingkan. */
export function buildBackup(data: BackupData, schemaVersion: number, exportedAt: Date): Backup {
  return {
    app: BACKUP_APP_ID,
    schemaVersion,
    exportedAt: exportedAt.toISOString(),
    data: {
      wallets: [...data.wallets].sort(byId),
      categories: [...data.categories].sort(byId),
      transactions: [...data.transactions].sort(byId),
      budgets: [...data.budgets].sort(byId),
      budgetPots: [...data.budgetPots].sort(byId),
      settings: [...data.settings].sort(byId),
    },
  }
}

export function backupCounts(data: BackupData) {
  return {
    wallets: data.wallets.length,
    categories: data.categories.length,
    transactions: data.transactions.length,
    budgets: data.budgets.length,
    budgetPots: data.budgetPots.length,
  }
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string }

type Rec = Record<string, unknown>

function isRecord(value: unknown): value is Rec {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isString = (v: unknown): v is string => typeof v === 'string'
const isOptString = (v: unknown) => v === undefined || isString(v)
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v)
const isName = (v: unknown) => isString(v) && v.trim() !== ''

function checkWallet(w: Rec): boolean {
  return isName(w.id) && isName(w.name) && isString(w.icon) && isString(w.color) && isRupiah(w.startBalance) && isBool(w.archived) && isInt(w.sort)
}

function checkCategory(c: Rec): boolean {
  return (
    isName(c.id) && (c.kind === 'expense' || c.kind === 'income') && isName(c.name) && isString(c.icon) &&
    isString(c.color) && isBool(c.archived) && isInt(c.sort) && isOptString(c.budgetPotId)
  )
}

function checkTransaction(t: Rec): boolean {
  return (
    isName(t.id) && (t.type === 'expense' || t.type === 'income' || t.type === 'transfer') && isRupiah(t.amount) &&
    isDateString(t.date) && isOptString(t.categoryId) && isOptString(t.walletId) && isOptString(t.fromWalletId) &&
    isOptString(t.toWalletId) && isOptString(t.note) && isInt(t.createdAt) && isInt(t.updatedAt)
  )
}

function checkBudget(b: Rec): boolean {
  return isName(b.id) && isMonthString(b.month) && isRupiah(b.totalFund) && (b.totalFund as number) >= 0
}

function checkPot(p: Rec): boolean {
  return (
    isName(p.id) && isName(p.budgetId) && isName(p.key) && isName(p.name) && isString(p.icon) && isString(p.color) &&
    isRupiah(p.amount) && (p.amount as number) >= 0 && isInt(p.sort) &&
    (p.manualUsed === undefined || (isRupiah(p.manualUsed) && (p.manualUsed as number) >= 0))
  )
}

function checkSettings(s: Rec): boolean {
  return (
    s.id === 'main' && (s.theme === 'light' || s.theme === 'dark' || s.theme === 'system') && isInt(s.schemaVersion) &&
    (s.lastBackupAt === undefined || isInt(s.lastBackupAt)) && isBool(s.includeArchivedInTotal)
  )
}

const TABLE_LABELS: Record<(typeof TABLES)[number], string> = {
  wallets: 'dompet',
  categories: 'kategori',
  transactions: 'transaksi',
  budgets: 'anggaran',
  budgetPots: 'pos anggaran',
  settings: 'pengaturan',
}

const CHECKS: Record<(typeof TABLES)[number], (r: Rec) => boolean> = {
  wallets: checkWallet,
  categories: checkCategory,
  transactions: checkTransaction,
  budgets: checkBudget,
  budgetPots: checkPot,
  settings: checkSettings,
}

const NOT_A_BACKUP = 'File ini bukan cadangan Keuangan Zaq. Pilih file .json hasil "Ekspor cadangan".'

/**
 * Membaca dan memeriksa file cadangan sebelum apa pun diganti. Versi skema harus sama persis
 * (PRD F8: tolak bila tidak cocok); data harus lolos aturan integritas PRD bagian 4.
 */
export function parseBackup(text: string, expectedSchemaVersion: number): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: NOT_A_BACKUP }
  }
  if (!isRecord(raw) || raw.app !== BACKUP_APP_ID || !isRecord(raw.data)) return { ok: false, error: NOT_A_BACKUP }
  if (!isInt(raw.schemaVersion)) return { ok: false, error: NOT_A_BACKUP }
  if (raw.schemaVersion !== expectedSchemaVersion) {
    const newer = raw.schemaVersion > expectedSchemaVersion
    return {
      ok: false,
      error: newer
        ? `Cadangan ini dibuat oleh versi aplikasi yang lebih baru (skema ${raw.schemaVersion}, aplikasi ini skema ${expectedSchemaVersion}). Perbarui aplikasi dulu, lalu impor lagi.`
        : `Cadangan ini dari versi aplikasi yang lebih lama (skema ${raw.schemaVersion}, aplikasi ini skema ${expectedSchemaVersion}), jadi tidak bisa diimpor.`,
    }
  }
  if (!isString(raw.exportedAt) || Number.isNaN(Date.parse(raw.exportedAt))) return { ok: false, error: NOT_A_BACKUP }

  const data = raw.data
  for (const table of TABLES) {
    const rows = data[table]
    if (!Array.isArray(rows)) return { ok: false, error: `Bagian ${TABLE_LABELS[table]} tidak ada di file. File mungkin rusak.` }
    const ids = new Set<string>()
    for (const [index, row] of rows.entries()) {
      if (!isRecord(row) || !CHECKS[table](row)) {
        return { ok: false, error: `Data ${TABLE_LABELS[table]} ke-${index + 1} tidak valid. File mungkin rusak atau sudah diubah.` }
      }
      if (ids.has(row.id as string)) {
        return { ok: false, error: `Ada ${TABLE_LABELS[table]} dengan id ganda. File mungkin rusak atau sudah diubah.` }
      }
      ids.add(row.id as string)
    }
  }

  const backup = raw as unknown as Backup
  const integrity = checkIntegrity(backup.data)
  if (integrity) return { ok: false, error: integrity }
  return { ok: true, backup }
}

function checkIntegrity(data: BackupData): string | null {
  const ctx = {
    wallets: new Map(data.wallets.map((w) => [w.id, w])),
    categories: new Map(data.categories.map((c) => [c.id, c])),
  }
  for (const [index, tx] of data.transactions.entries()) {
    const error = validateTransaction(tx, ctx)
    if (error) return `Transaksi ke-${index + 1} tidak valid: ${error.charAt(0).toLowerCase()}${error.slice(1)}`
  }
  const budgetIds = new Set(data.budgets.map((b) => b.id))
  if (data.budgetPots.some((p) => !budgetIds.has(p.budgetId))) {
    return 'Ada pos anggaran tanpa anggaran bulannya. File mungkin rusak atau sudah diubah.'
  }
  if (new Set(data.budgets.map((b) => b.month)).size !== data.budgets.length) {
    return 'Ada dua anggaran untuk bulan yang sama. File mungkin rusak atau sudah diubah.'
  }
  return null
}
