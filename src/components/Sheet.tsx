import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface SheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Untuk konfirmasi, supaya pembaca layar mengumumkannya sebagai peringatan. */
  role?: 'dialog' | 'alertdialog'
}

// Lembar bisa bertumpuk (misalnya keypad di atas form). Escape hanya menutup yang paling atas.
const openSheets: string[] = []

export function Sheet({ open, title, onClose, children, role = 'dialog' }: SheetProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    openSheets.push(titleId)
    panelRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && openSheets.at(-1) === titleId) {
        event.preventDefault()
        onCloseRef.current()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      openSheets.splice(openSheets.lastIndexOf(titleId), 1)
      previouslyFocused?.focus()
    }
  }, [open, titleId])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div aria-hidden="true" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-card bg-surface shadow-2xl outline-none"
      >
        <div className="shrink-0 px-4 pt-3">
          <div aria-hidden="true" className="mx-auto mb-2 h-1 w-10 rounded-full bg-line" />
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  )
}
