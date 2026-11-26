import { Delete } from 'lucide-react'
import type { Rupiah } from '../db/types'
import { addQuick, backspace, pressKey, type KeypadKey } from '../lib/keypad'
import { MAX_RUPIAH, formatRupiahCompact } from '../lib/money'

interface KeypadProps {
  value: Rupiah
  onChange: (value: Rupiah) => void
  max?: Rupiah
  /** Pintasan seperti +10rb dan +50rb. */
  quickAmounts?: readonly Rupiah[]
}

const KEYS: readonly KeypadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0']

const keyClass =
  'flex min-h-12 items-center justify-center rounded-control bg-surface-2 text-2xl font-medium tabular-nums transition active:scale-95 active:bg-line'

export function Keypad({ value, onChange, max = MAX_RUPIAH, quickAmounts = [] }: KeypadProps) {
  return (
    <div className="flex flex-col gap-2">
      {quickAmounts.length > 0 && (
        <div className="flex gap-2">
          {quickAmounts.map((amount) => {
            const label = `+${formatRupiahCompact(amount).replace('Rp', '').replace(' ', '')}`
            return (
              <button
                key={amount}
                type="button"
                onClick={() => onChange(addQuick(value, amount, max))}
                aria-label={`Tambah ${formatRupiahCompact(amount)}`}
                className="min-h-11 flex-1 rounded-full border border-line text-sm font-semibold text-accent hover:bg-accent-soft"
              >
                {label}
              </button>
            )
          })}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button key={key} type="button" onClick={() => onChange(pressKey(value, key, max))} className={keyClass}>
            {key}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(backspace(value))}
          aria-label="Hapus satu digit"
          className={keyClass}
        >
          <Delete aria-hidden="true" className="size-6" />
        </button>
      </div>
    </div>
  )
}
