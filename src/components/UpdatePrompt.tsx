import { RefreshCw } from 'lucide-react'
import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useSnackbar } from './useSnackbar'

/**
 * Mendaftarkan service worker. Versi baru tidak langsung dipakai: pengguna menekan "Muat ulang"
 * sendiri, supaya transaksi yang sedang diketik tidak hilang.
 */
export function UpdatePrompt() {
  const showSnackbar = useSnackbar((s) => s.show)
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!offlineReady) return
    showSnackbar('Aplikasi siap dipakai tanpa internet.')
    setOfflineReady(false)
  }, [offlineReady, setOfflineReady, showSnackbar])

  if (!needRefresh) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)]"
    >
      <div className="flex w-full max-w-md items-center gap-2 rounded-control bg-ink py-1 pr-1 pl-4 text-canvas shadow-xl">
        <p className="flex-1 py-2 text-sm">Versi baru tersedia.</p>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="min-h-11 rounded-control px-3 text-sm font-medium opacity-80 hover:bg-white/10"
        >
          Nanti
        </button>
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="flex min-h-11 items-center gap-1.5 rounded-control px-3 text-sm font-semibold text-accent-soft hover:bg-white/10"
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          Muat ulang
        </button>
      </div>
    </div>
  )
}
