export type ThemePreference = 'light' | 'dark' | 'system'

// Hanya preferensi UI kecil yang boleh di localStorage (AGENTS.md aturan 7).
const STORAGE_KEY = 'kz-tema'

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isThemePreference(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function applyThemePreference(pref: ThemePreference, root: HTMLElement = document.documentElement): void {
  if (pref === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', pref)
  }
}

export function saveThemePreference(pref: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    // Penyimpanan bisa diblokir (mode privat); tema tetap berlaku untuk sesi ini.
  }
  applyThemePreference(pref)
}
