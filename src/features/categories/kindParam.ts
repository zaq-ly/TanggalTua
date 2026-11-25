import type { CategoryKind } from '../../db/types'

export const KIND_PARAM = 'jenis'

const PARAM_BY_KIND: Record<CategoryKind, string> = { expense: 'pengeluaran', income: 'pemasukan' }

export const KIND_LABELS: Record<CategoryKind, string> = { expense: 'Pengeluaran', income: 'Pemasukan' }

export function kindFromParam(value: string | null): CategoryKind {
  return value === PARAM_BY_KIND.income ? 'income' : 'expense'
}

export function categoriesPath(kind: CategoryKind): string {
  return `/pengaturan/kategori?${KIND_PARAM}=${PARAM_BY_KIND[kind]}`
}

export function newCategoryPath(kind: CategoryKind): string {
  return `/pengaturan/kategori/baru?${KIND_PARAM}=${PARAM_BY_KIND[kind]}`
}
