import { useState } from 'react'
import type { Rupiah } from '../db/types'
import { MAX_RUPIAH, formatRupiah } from '../lib/money'
import { Button } from './Button'
import { Keypad } from './Keypad'
import { Sheet } from './Sheet'

interface AmountSheetProps {
  open: boolean
  title: string
  initialValue: number
  onClose: () => void
  onSave: (value: number) => void
  quickAmounts?: readonly Rupiah[]
  /** Batas atas; misalnya 100 untuk persen. */
  max?: number
  /** Tampilan angka; bawaan `Rp1.234`. */
  format?: (value: number) => string
  /** Teks kecil di bawah angka, misalnya hasil konversi persen ke rupiah. */
  describe?: (value: number) => string
}

/** Lembar keypad untuk mengisi satu angka. Nilai baru hanya disimpan saat tombol Simpan ditekan. */
export function AmountSheet({ open, title, onClose, ...rest }: AmountSheetProps) {
  return (
    <Sheet open={open} title={title} onClose={onClose}>
      {open && <AmountSheetBody onClose={onClose} {...rest} />}
    </Sheet>
  )
}

function AmountSheetBody({
  initialValue,
  onSave,
  onClose,
  quickAmounts,
  max = MAX_RUPIAH,
  format = formatRupiah,
  describe,
}: Omit<AmountSheetProps, 'open' | 'title'>) {
  const [value, setValue] = useState(initialValue)
  return (
    <div className="flex flex-col gap-4">
      <div className="py-2 text-center" aria-live="polite">
        <output className="block text-4xl font-semibold tracking-tight tabular-nums">{format(value)}</output>
        {describe && <p className="mt-1 text-sm text-muted tabular-nums">{describe(value)}</p>}
      </div>
      <Keypad value={value} onChange={setValue} quickAmounts={quickAmounts} max={max} />
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
