import { normalizeName, validateName } from '../domain/names'
import { nextSort, sortUpdates } from '../domain/ordering'
import { validateStartBalance } from '../domain/wallets'
import { newId } from '../lib/id'
import { db as defaultDb } from './db'
import { UserFacingError } from './errors'
import type { KeuanganDB } from './schema'
import type { Rupiah, Wallet } from './types'

export interface WalletInput {
  name: string
  icon: string
  color: string
  startBalance: Rupiah
}

async function activeNamesExcept(database: KeuanganDB, excludeId?: string): Promise<string[]> {
  const wallets = await database.wallets.toArray()
  return wallets.filter((w) => !w.archived && w.id !== excludeId).map((w) => w.name)
}

function assertValid(input: WalletInput, otherNames: readonly string[]): void {
  const error = validateName(input.name, otherNames, 'dompet') ?? validateStartBalance(input.startBalance)
  if (error) throw new UserFacingError(error)
}

export async function createWallet(input: WalletInput, database: KeuanganDB = defaultDb): Promise<string> {
  return database.transaction('rw', database.wallets, async () => {
    assertValid(input, await activeNamesExcept(database))
    const wallet: Wallet = {
      id: newId(),
      name: normalizeName(input.name),
      icon: input.icon,
      color: input.color,
      startBalance: input.startBalance,
      archived: false,
      sort: nextSort(await database.wallets.toArray()),
    }
    await database.wallets.add(wallet)
    return wallet.id
  })
}

export async function updateWallet(id: string, input: WalletInput, database: KeuanganDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.wallets, async () => {
    const existing = await database.wallets.get(id)
    if (!existing) throw new UserFacingError('Dompet tidak ditemukan. Mungkin sudah dihapus.')
    assertValid(input, existing.archived ? [] : await activeNamesExcept(database, id))
    await database.wallets.update(id, {
      name: normalizeName(input.name),
      icon: input.icon,
      color: input.color,
      startBalance: input.startBalance,
    })
  })
}

export async function setWalletArchived(id: string, archived: boolean, database: KeuanganDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.wallets, async () => {
    const existing = await database.wallets.get(id)
    if (!existing) throw new UserFacingError('Dompet tidak ditemukan. Mungkin sudah dihapus.')
    if (!archived) {
      const conflict = validateName(existing.name, await activeNamesExcept(database, id), 'dompet')
      if (conflict) throw new UserFacingError(`${conflict} Ubah nama dompet aktif itu dulu, lalu pulihkan.`)
    }
    await database.wallets.update(id, { archived })
  })
}

export async function isWalletUsed(id: string, database: KeuanganDB = defaultDb): Promise<boolean> {
  const t = database.transactions
  const [asWallet, asFrom, asTo] = await Promise.all([
    t.where('walletId').equals(id).count(),
    t.where('fromWalletId').equals(id).count(),
    t.where('toWalletId').equals(id).count(),
  ])
  return asWallet + asFrom + asTo > 0
}

/** Hanya untuk dompet yang belum pernah dipakai transaksi (AGENTS.md aturan 5). */
export async function deleteWallet(id: string, database: KeuanganDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.wallets, database.transactions, async () => {
    if (await isWalletUsed(id, database)) {
      throw new UserFacingError('Dompet ini sudah dipakai transaksi, jadi tidak bisa dihapus. Arsipkan saja.')
    }
    await database.wallets.delete(id)
  })
}

export async function reorderWallets(orderedIds: readonly string[], database: KeuanganDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.wallets, async () => {
    await Promise.all(sortUpdates(orderedIds).map(({ id, sort }) => database.wallets.update(id, { sort })))
  })
}
