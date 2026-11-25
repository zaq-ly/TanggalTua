import { useState } from 'react'
import type { Rupiah } from '../db/types'
import { formatRupiah } from '../lib/money'
import { Button } from './Button'
import { Keypad } from './Keypad'
import { Sheet } from './Sheet'

interface AmountSheetProps {
  open: boolean
  title: string
  initialValue: Rupiah
  onClose: () => void
  onSave: (value: Rupiah) => void
  quickAmounts?: readonly Rupiah[]
}

/** Lembar keypad untuk mengisi satu jumlah. Nilai baru hanya disimpan saat tombol Simpan ditekan. */
export function AmountSheet({ open, title, initialValue, onClose, onSave, quickAmounts }: AmountSheetProps) {
  return (
    <Sheet open={open} title={title} onClose={onClose}>
      {open && (
        <AmountSheetBody initialValue={initialValue} onSave={onSave} onClose={onClose} quickAmounts={quickAmounts} />
      )}
    </Sheet>
  )
}

function AmountSheetBody({
  initialValue,
  onSave,
  onClose,
  quickAmounts,
}: Pick<AmountSheetProps, 'initialValue' | 'onSave' | 'onClose' | 'quickAmounts'>) {
  const [value, setValue] = useState(initialValue)
  return (
    <div className="flex flex-col gap-4">
      <output
        aria-live="polite"
        className="block py-2 text-center text-4xl font-semibold tracking-tight tabular-nums"
      >
        {formatRupiah(value)}
      </output>
      <Keypad value={value} onChange={setValue} quickAmounts={quickAmounts} />
      <Button
        block
        onClick={() => {
          onSave(value)
          onClose()
        }}
      >
        Simpan
      </Button>
    </div>
  )
}
