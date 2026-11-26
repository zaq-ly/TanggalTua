import { ChevronRight, Tags, Wallet, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { BackupSection } from '../backup/BackupSection'

interface SettingsLink {
  to: string
  label: string
  description: string
  icon: LucideIcon
}

const LINKS: readonly SettingsLink[] = [
  { to: '/pengaturan/dompet', label: 'Dompet', description: 'Tambah, ubah, urutkan, dan arsipkan dompet', icon: Wallet },
  { to: '/pengaturan/kategori', label: 'Kategori', description: 'Kategori pengeluaran dan pemasukan', icon: Tags },
]

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Pengaturan" backTo="/" backLabel="Kembali ke Beranda" />
      <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface">
        {LINKS.map(({ to, label, description, icon: Icon }) => (
          <li key={to}>
            <Link to={to} className="flex min-h-16 items-center gap-3 px-4 hover:bg-surface-2">
              <Icon aria-hidden="true" className="size-5 text-accent" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{label}</span>
                <span className="block truncate text-sm text-muted">{description}</span>
              </span>
              <ChevronRight aria-hidden="true" className="size-5 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
      <BackupSection />
    </>
  )
}
