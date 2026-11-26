import { ChevronDown } from 'lucide-react'
import { EntityIcon } from './EntityIcon'

interface FilterButtonProps {
  /** Nama filter untuk pembaca layar, misalnya "Saring dompet". */
  label: string
  valueLabel: string
  /** Ikon entitas yang sedang dipilih; kosong saat filter belum dipakai. */
  entity?: { icon: string; color: string }
  onClick: () => void
}

export function FilterButton({ label, valueLabel, entity, onClick }: FilterButtonProps) {
  const active = entity !== undefined
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={`${label}: ${valueLabel}`}
      className={`flex min-h-11 w-full min-w-0 items-center gap-1.5 rounded-full border pr-2.5 text-sm font-medium transition-colors motion-reduce:transition-none ${
        active ? 'border-accent bg-accent-soft pl-1.5 text-accent' : 'border-line bg-surface pl-3.5 text-ink hover:bg-surface-2'
      }`}
    >
      {entity && <EntityIcon icon={entity.icon} color={entity.color} size="xs" />}
      <span className="min-w-0 flex-1 truncate text-left">{valueLabel}</span>
      <ChevronDown aria-hidden="true" className={`size-4 shrink-0 ${active ? 'text-accent' : 'text-muted'}`} />
    </button>
  )
}
