export type ThemePreference = 'light' | 'dark' | 'system'

// Hanya preferensi UI kecil yang boleh di localStorage (AGENTS.md aturan 7). Salinan utamanya
// ada di Settings (ikut cadangan); localStorage dipakai supaya tema benar sejak layar pertama.
const STORAGE_KEY = 'kz-tema'

/** Sama dengan --canvas di styles/index.css; dipakai untuk warna bilah status HP. */
const CANVAS_COLORS = { light: '#f5f6fb', dark: '#0f1118' } as const

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

function syncThemeColorMeta(pref: ThemePreference): void {
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const scheme = meta.media.includes('dark') ? 'dark' : 'light'
    meta.content = CANVAS_COLORS[pref === 'system' ? scheme : pref]
  }
}

export function applyThemePreference(pref: ThemePreference, root: HTMLElement = document.documentElement): void {
  if (pref === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', pref)
  }
  syncThemeColorMeta(pref)
}

export function saveThemePreference(pref: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    // Penyimpanan bisa diblokir (mode privat); tema tetap berlaku untuk sesi ini.
  }
  applyThemePreference(pref)
}
