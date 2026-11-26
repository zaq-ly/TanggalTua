import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { getSettings } from '../../db/db'
import { readThemePreference, saveThemePreference } from '../../lib/theme'

/**
 * Tema tersimpan di Settings (ikut cadangan). Bila berbeda dengan salinan di localStorage,
 * misalnya setelah impor cadangan, salinan itu disamakan dan tema langsung berlaku.
 */
export function ThemeSync() {
  const theme = useLiveQuery(async () => (await getSettings()).theme)
  useEffect(() => {
    if (theme && theme !== readThemePreference()) saveThemePreference(theme)
  }, [theme])
  return null
}
