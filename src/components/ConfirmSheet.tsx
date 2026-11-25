import { useState } from 'react'
import { messageOf } from '../db/errors'
import { Button } from './Button'
import { Sheet } from './Sheet'

interface ConfirmSheetProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => Promise<void>
  onClose: () => void
}

export function ConfirmSheet({ open, title, description, confirmLabel, danger = false, onConfirm, onClose }: ConfirmSheetProps) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} title={title} onClose={onClose} role="alertdialog">
      <div className="flex flex-col gap-4">
        <p className="text-muted">{description}</p>
        {error && (
          <p role="alert" className="text-sm text-expense">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Button variant={danger ? 'danger' : 'primary'} block disabled={busy} onClick={() => void confirm()}>
            {confirmLabel}
          </Button>
          <Button variant="secondary" block onClick={onClose}>
            Batal
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
