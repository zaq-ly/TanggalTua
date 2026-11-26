import { useEffect } from 'react'
import { SNACKBAR_DURATION_MS, useSnackbar } from './useSnackbar'

export function Snackbar() {
  const { id, message, action, hide } = useSnackbar()

  useEffect(() => {
    if (message === null) return
    const timer = window.setTimeout(hide, SNACKBAR_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [id, message, hide])

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom)+0.75rem)] z-50 flex justify-center px-4"
    >
      {message !== null && (
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-control bg-ink py-1 pr-1 pl-4 text-canvas shadow-xl">
          <p className="flex-1 py-2 text-sm">{message}</p>
          {action && (
            <button
              type="button"
              onClick={() => {
                hide()
                void action.run()
              }}
              className="min-h-11 rounded-control px-4 text-sm font-semibold text-accent-soft hover:bg-white/10"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
