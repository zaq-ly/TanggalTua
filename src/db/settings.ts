import { db as defaultDb, getSettings } from './db'
import type { KeuanganDB } from './schema'

export async function setIncludeArchivedInTotal(value: boolean, database: KeuanganDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.settings, async () => {
    const current = await getSettings(database)
    await database.settings.put({ ...current, includeArchivedInTotal: value })
  })
}
