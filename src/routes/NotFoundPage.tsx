import { Link } from 'react-router'
import { Compass } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'

export function NotFoundPage() {
  return (
    <div className="pt-[env(safe-area-inset-top)]">
      <EmptyState
        icon={Compass}
        title="Halaman tidak ditemukan"
        description="Alamat ini tidak ada di aplikasi. Kembali ke Beranda untuk melanjutkan."
        action={
          <Link to="/" className="flex min-h-11 items-center rounded-control bg-accent px-5 font-medium text-accent-ink">
            Buka Beranda
          </Link>
        }
      />
    </div>
  )
}
