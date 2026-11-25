import { DEFAULT_SETTINGS, KeuanganDB } from './schema'
import type { Settings } from './types'

export const db = new KeuanganDB()

export async function getSettings(database: KeuanganDB = db): Promise<Settings> {
  const stored = await database.settings.get('main')
  return stored ?? { ...DEFAULT_SETTINGS }
}
