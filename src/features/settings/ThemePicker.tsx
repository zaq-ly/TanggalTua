import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { getSettings } from '../../db/db'
import { setTheme } from '../../db/settings'
import { readThemePreference, saveThemePreference, type ThemePreference } from '../../lib/theme'

const OPTIONS: readonly { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: 'system', label: 'Ikuti sistem', icon: Monitor },
  { value: 'light', label: 'Terang', icon: Sun },
  { value: 'dark', label: 'Gelap', icon: Moon },
]

export function ThemePicker() {
  const stored = useLiveQuery(async () => (await getSettings()).theme)
  // Pilihan langsung terlihat tanpa menunggu database selesai menyimpan.
  const [chosen, setChosen] = useState<ThemePreference | null>(null)
  const theme = chosen ?? stored ?? readThemePreference()

  function choose(value: ThemePreference) {
    setChosen(value)
    // Diterapkan langsung, lalu disimpan ke database supaya ikut cadangan.
    saveThemePreference(value)
    void setTheme(value)
  }

  return (
    <section aria-labelledby="judul-tampilan" className="flex flex-col gap-3">
      <h2 id="judul-tampilan" className="px-1 font-semibold">
        Tampilan
      </h2>
      <div role="radiogroup" aria-labelledby="judul-tampilan" className="grid grid-cols-3 gap-2">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={theme === value}
            onClick={() => choose(value)}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-card border border-line bg-surface text-sm font-medium aria-checked:border-accent aria-checked:bg-accent-soft aria-checked:text-accent"
          >
            <Icon aria-hidden="true" className="size-5" />
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}
