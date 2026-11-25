import type { ThemePreference } from '../lib/theme'

/** Rupiah sebagai bilangan bulat. Tidak pernah pecahan. */
export type Rupiah = number

/** Tanggal lokal `YYYY-MM-DD`. */
export type DateString = string

/** Bulan `YYYY-MM`. */
export type MonthString = string

export type CategoryKind = 'expense' | 'income'
export type TransactionType = 'expense' | 'income' | 'transfer'

export interface Wallet {
  id: string
  name: string
  icon: string
  color: string
  startBalance: Rupiah
  archived: boolean
  sort: number
}

export interface Category {
  id: string
  kind: CategoryKind
  name: string
  icon: string
  color: string
  archived: boolean
  sort: number
  budgetPotId?: string
}

export interface Transaction {
  id: string
  type: TransactionType
  /** Selalu > 0. Arah ditentukan oleh `type`. */
  amount: Rupiah
  date: DateString
  categoryId?: string
  walletId?: string
  fromWalletId?: string
  toWalletId?: string
  note?: string
  createdAt: number
  updatedAt: number
}

export interface Budget {
  id: string
  month: MonthString
  totalFund: Rupiah
}

export interface BudgetPot {
  id: string
  budgetId: string
  name: string
  icon: string
  color: string
  amount: Rupiah
  sort: number
  manualUsed?: Rupiah
}

export interface Settings {
  id: 'main'
  theme: ThemePreference
  schemaVersion: number
  lastBackupAt?: number
  includeArchivedInTotal: boolean
}
