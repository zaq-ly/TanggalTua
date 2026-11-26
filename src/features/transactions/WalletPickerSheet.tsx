import { Check } from 'lucide-react'
import { EntityIcon } from '../../components/EntityIcon'
import { Sheet } from '../../components/Sheet'
import type { Wallet } from '../../db/types'

interface WalletPickerSheetProps {
  open: boolean
  title: string
  wallets: readonly Wallet[]
  selectedId: string | undefined
  /** Dompet yang tidak boleh dipilih, misalnya dompet asal saat memilih tujuan transfer. */
  disabledId?: string
  onSelect: (id: string) => void
  onClose: () => void
}

export function WalletPickerSheet({ open, title, wallets, selectedId, disabledId, onSelect, onClose }: WalletPickerSheetProps) {
  return (
    <Sheet open={open} title={title} onClose={onClose}>
      <ul role="radiogroup" aria-label={title} className="flex flex-col gap-1 pb-2">
        {wallets.map((w) => {
          const selected = w.id === selectedId
          return (
            <li key={w.id}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={w.id === disabledId}
                onClick={() => {
                  onSelect(w.id)
                  onClose()
                }}
                className="flex min-h-14 w-full items-center gap-3 rounded-control px-2 text-left hover:bg-surface-2 disabled:opacity-40 aria-checked:bg-accent-soft"
              >
                <EntityIcon icon={w.icon} color={w.color} />
                <span className="flex-1 font-medium">
                  {w.name}
                  {w.archived && <span className="ml-2 text-sm font-normal text-muted">(diarsipkan)</span>}
                </span>
                {selected && <Check aria-hidden="true" className="size-5 text-accent" />}
              </button>
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}
