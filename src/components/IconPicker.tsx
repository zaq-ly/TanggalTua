import { Search } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { colorVar } from '../lib/palette'
import { ICON_GROUPS, searchIcons, type IconEntry } from './iconRegistry'

interface IconPickerProps {
  value: string
  color: string
  onChange: (icon: string) => void
}

export function IconPicker({ value, color, onChange }: IconPickerProps) {
  const [query, setQuery] = useState('')
  const results = searchIcons(query)
  const searching = query.trim() !== ''

  function renderGrid(icons: IconEntry[]) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-1">
        {icons.map(({ name, Icon, label }) => {
          const selected = name === value
          return (
            <button
              key={name}
              type="button"
              aria-pressed={selected}
              aria-label={label}
              title={label}
              onClick={() => onChange(name)}
              className={`flex size-12 items-center justify-center rounded-control transition-colors ${
                selected
                  ? 'bg-[color-mix(in_oklab,var(--entity)_18%,transparent)] text-(--entity) ring-2 ring-(--entity)'
                  : 'text-muted hover:bg-surface-2 hover:text-ink'
              }`}
            >
              <Icon aria-hidden="true" className="size-6" strokeWidth={1.9} />
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4" style={{ '--entity': colorVar(color) } as CSSProperties}>
      <label className="relative block">
        <span className="sr-only">Cari ikon</span>
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari ikon, misalnya kopi"
          className="min-h-12 w-full rounded-control border border-line bg-surface pr-4 pl-11 text-base"
        />
      </label>

      {searching ? (
        results.length > 0 ? (
          renderGrid(results)
        ) : (
          <p className="py-6 text-center text-sm text-muted">
            Tidak ada ikon untuk "{query.trim()}". Coba kata lain, misalnya makan, bank, atau motor.
          </p>
        )
      ) : (
        ICON_GROUPS.map((group) => (
          <section key={group.label} aria-label={group.label} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted">{group.label}</h3>
            {renderGrid(group.icons)}
          </section>
        ))
      )}
    </div>
  )
}
