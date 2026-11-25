import { buildDefaultCategories } from '../domain/defaults'
import { normalizeName, validateName } from '../domain/names'
import { nextSort, sortUpdates } from '../domain/ordering'
import { newId } from '../lib/id'
import { db as defaultDb } from './db'
import { UserFacingError } from './errors'
import type { KeuanganDB } from './schema'
import type { Category, CategoryKind } from './types'

export interface CategoryInput {
  name: string
  icon: string
  color: string
}

async function activeNamesExcept(database: KeuanganDB, kind: CategoryKind, excludeId?: string): Promise<string[]> {
  const categories = await database.categories.where('kind').equals(kind).toArray()
  return categories.filter((c) => !c.archived && c.id !== excludeId).map((c) => c.name)
}

function assertValidName(name: string, otherNames: readonly string[]): void {
  const error = validateName(name, otherNames, 'kategori')
  if (error) throw new UserFacingError(error)
}

export async function createCategory(
  kind: CategoryKind,
  input: CategoryInput,
  database: KeuanganDB = defaultDb,
): Promise<string> {
  return database.transaction('rw', database.categories, async () => {
    assertValidName(input.name, await activeNamesExcept(database, kind))
    const category: Category = {
      id: newId(),
      kind,
      name: normalizeName(input.name),
      icon: input.icon,
      color: input.color,
      archived: false,
      sort: nextSort(await database.categories.where('kind').equals(kind).toArray()),
    }
    await database.categories.add(category)
    return category.id
  })
}

export async function updateCategory(id: string, input: CategoryInput, database: KeuanganDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.categories, async () => {
    const existing = await database.categories.get(id)
    if (!existing) throw new UserFacingError('Kategori tidak ditemukan. Mungkin sudah dihapus.')
    assertValidName(input.name, existing.archived ? [] : await activeNamesExcept(database, existing.kind, id))
    await database.categories.update(id, { name: normalizeName(input.name), icon: input.icon, color: input.color })
  })
}

export async function setCategoryArchived(id: string, archived: boolean, database: KeuanganDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.categories, async () => {
    const existing = await database.categories.get(id)
    if (!existing) throw new UserFacingError('Kategori tidak ditemukan. Mungkin sudah dihapus.')
    if (!archived) {
      const conflict = validateName(existing.name, await activeNamesExcept(database, existing.kind, id), 'kategori')
      if (conflict) throw new UserFacingError(`${conflict} Ubah nama kategori aktif itu dulu, lalu pulihkan.`)
    }
    await database.categories.update(id, { archived })
  })
}

export async function isCategoryUsed(id: string, database: KeuanganDB = defaultDb): Promise<boolean> {
  return (await database.transactions.where('categoryId').equals(id).count()) > 0
}

/** Hanya untuk kategori yang belum pernah dipakai transaksi (AGENTS.md aturan 5). */
export async function deleteCategory(id: string, database: KeuanganDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.categories, database.transactions, async () => {
    if (await isCategoryUsed(id, database)) {
      throw new UserFacingError('Kategori ini sudah dipakai transaksi, jadi tidak bisa dihapus. Arsipkan saja.')
    }
    await database.categories.delete(id)
  })
}

export async function reorderCategories(orderedIds: readonly string[], database: KeuanganDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.categories, async () => {
    await Promise.all(sortUpdates(orderedIds).map(({ id, sort }) => database.categories.update(id, { sort })))
  })
}

/** Mengisi kategori bawaan hanya bila belum ada kategori sama sekali. Mengembalikan jumlah yang ditambahkan. */
export async function ensureDefaultCategories(database: KeuanganDB = defaultDb): Promise<number> {
  return database.transaction('rw', database.categories, async () => {
    if ((await database.categories.count()) > 0) return 0
    const defaults = buildDefaultCategories(newId)
    await database.categories.bulkAdd(defaults)
    return defaults.length
  })
}
