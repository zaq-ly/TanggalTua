import { useEffect, useState } from 'react'
import { Button } from '../../components/Button'
import { persistStatus, requestPersistentStorage, type PersistStatus } from '../../lib/storage'

const TEXT: Record<PersistStatus, string> = {
  persisted: 'Penyimpanan persisten aktif. Browser tidak akan menghapus data saat ruang HP menipis.',
  'not-persisted':
    'Penyimpanan persisten belum aktif, jadi browser bisa menghapus data saat ruang HP menipis. Pasang aplikasi ke layar utama lalu ketuk "Aktifkan".',
  unsupported: 'Browser ini tidak mendukung penyimpanan persisten. Rajin-rajinlah mengekspor cadangan.',
}

export function StorageStatus() {
  const [status, setStatus] = useState<PersistStatus | null>(null)

  useEffect(() => {
    let active = true
    persistStatus()
      .catch((): PersistStatus => 'unsupported')
      .then((s) => {
        if (active) setStatus(s)
      })
    return () => {
      active = false
    }
  }, [])

  if (status === null) return null

  return (
    <section aria-labelledby="judul-penyimpanan" className="flex flex-col gap-3">
      <h2 id="judul-penyimpanan" className="px-1 font-semibold">
        Penyimpanan
      </h2>
      <div className="flex flex-col gap-3 rounded-card bg-surface px-4 py-4">
        <p className="text-sm" aria-live="polite">
          {TEXT[status]}
        </p>
        {status === 'not-persisted' && (
          <Button
            variant="secondary"
            block
            onClick={() => void requestPersistentStorage().catch((): PersistStatus => 'unsupported').then(setStatus)}
          >
            Aktifkan penyimpanan persisten
          </Button>
        )}
      </div>
    </section>
  )
}
