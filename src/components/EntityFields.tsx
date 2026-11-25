import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { EntityIcon } from './EntityIcon'
import { ColorPicker } from './ColorPicker'
import { IconPicker } from './IconPicker'
import { Sheet } from './Sheet'
import { TextField } from './TextField'
import { NAME_MAX_LENGTH } from '../domain/names'

export interface EntityDraft {
  name: string
  icon: string
  color: string
}

interface EntityFieldsProps {
  draft: EntityDraft
  onChange: (draft: EntityDraft) => void
  nameLabel: string
  namePlaceholder: string
  nameError?: string | null
}

/** Nama, ikon, dan warna. Dipakai bersama oleh form dompet, kategori, dan nanti pos anggaran. */
export function EntityFields({ draft, onChange, nameLabel, namePlaceholder, nameError }: EntityFieldsProps) {
  const [pickingIcon, setPickingIcon] = useState(false)

  return (
    <>
      <TextField
        label={nameLabel}
        value={draft.name}
        onChange={(e) => onChange({ ...draft, name: e.target.value })}
        placeholder={namePlaceholder}
        maxLength={NAME_MAX_LENGTH + 10}
        autoComplete="off"
        error={nameError}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted">Ikon</span>
        <button
          type="button"
          onClick={() => setPickingIcon(true)}
          className="flex min-h-14 items-center gap-3 rounded-control border border-line bg-surface px-3 text-left hover:bg-surface-2"
        >
          <EntityIcon icon={draft.icon} color={draft.color} />
          <span className="flex-1 font-medium">Ganti ikon</span>
          <ChevronRight aria-hidden="true" className="size-5 text-muted" />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <span aria-hidden="true" className="text-sm font-medium text-muted">
          Warna
        </span>
        <ColorPicker value={draft.color} onChange={(color) => onChange({ ...draft, color })} />
      </div>

      <Sheet open={pickingIcon} title="Pilih ikon" onClose={() => setPickingIcon(false)}>
        <IconPicker
          value={draft.icon}
          color={draft.color}
          onChange={(icon) => {
            onChange({ ...draft, icon })
            setPickingIcon(false)
          }}
        />
      </Sheet>
    </>
  )
}
