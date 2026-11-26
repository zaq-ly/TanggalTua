import { Check, Layers } from 'lucide-react'
import type { ReactNode } from 'react'
import { EntityIcon } from '../../components/EntityIcon'
import { Sheet } from '../../components/Sheet'

export interface FilterOption {
  id: string
  name: string
  icon: string
  color: string
  archived: boolean
}

export interface FilterGroup {
  label?: string
  options: readonly FilterOption[]
}

interface FilterPickerSheetProps {
  open: boolean
  title: string
  allLabel: string
  groups: readonly FilterGroup[]
  selectedId: string | undefined
  onSelect: (id: string | undefined) => void
  onClose: () => void
}

const optionClass =
  'flex min-h-14 w-full items-center gap-3 rounded-control px-2 text-left hover:bg-surface-2 aria-checked:bg-accent-soft'

export function FilterPickerSheet({ open, title, allLabel, groups, selectedId, onSelect, onClose }: FilterPickerSheetProps) {
  function choose(id: string | undefined) {
    onSelect(id)
    onClose()
  }

  return (
    <Sheet open={open} title={title} onClose={onClose}>
      <div role="radiogroup" aria-label={title} className="flex flex-col gap-3 pb-2">
        <Option selected={selectedId === undefined} onClick={() => choose(undefined)}>
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
            <Layers className="size-5" strokeWidth={1.9} />
          </span>
          <span className="flex-1 font-medium">{allLabel}</span>
        </Option>

        {groups
          .filter((g) => g.options.length > 0)
          .map((group, index) => (
            <div key={group.label ?? index} className="flex flex-col gap-1">
              {group.label && <h3 className="px-2 pb-0.5 text-sm font-semibold text-muted">{group.label}</h3>}
              {group.options.map((o) => (
                <Option key={o.id} selected={o.id === selectedId} onClick={() => choose(o.id)}>
                  <EntityIcon icon={o.icon} color={o.color} />
                  <span className="min-w-0 flex-1 font-medium">
                    {o.name}
                    {o.archived && <span className="ml-2 text-sm font-normal text-muted">(diarsipkan)</span>}
                  </span>
                </Option>
              ))}
            </div>
          ))}
      </div>
    </Sheet>
  )
}

function Option({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onClick} className={optionClass}>
      {children}
      {selected && <Check aria-hidden="true" className="size-5 shrink-0 text-accent" />}
    </button>
  )
}
