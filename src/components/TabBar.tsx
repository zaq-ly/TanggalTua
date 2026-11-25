import { NavLink } from 'react-router'
import { ChartPie, House, PiggyBank, Plus, ReceiptText, type LucideIcon } from 'lucide-react'
import { useAddSheet } from '../features/transactions/useAddSheet'

interface TabItem {
  to: string
  label: string
  icon: LucideIcon
}

const LEFT_TABS: TabItem[] = [
  { to: '/', label: 'Beranda', icon: House },
  { to: '/riwayat', label: 'Riwayat', icon: ReceiptText },
]

const RIGHT_TABS: TabItem[] = [
  { to: '/anggaran', label: 'Anggaran', icon: PiggyBank },
  { to: '/statistik', label: 'Statistik', icon: ChartPie },
]

function TabLink({ to, label, icon: Icon }: TabItem) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        [
          'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-control text-xs font-medium transition-colors',
          isActive ? 'text-accent' : 'text-muted hover:text-ink',
        ].join(' ')
      }
    >
      <Icon aria-hidden="true" className="size-6" strokeWidth={1.75} />
      <span>{label}</span>
    </NavLink>
  )
}

export function TabBar() {
  const openAddSheet = useAddSheet((s) => s.open)

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto flex h-tabbar max-w-lg items-center gap-1 px-2">
        {LEFT_TABS.map((tab) => (
          <TabLink key={tab.to} {...tab} />
        ))}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={openAddSheet}
            aria-label="Tambah transaksi"
            className="flex size-14 -translate-y-3 items-center justify-center rounded-full bg-accent text-accent-ink shadow-lg shadow-accent/25 transition-transform active:scale-95"
          >
            <Plus aria-hidden="true" className="size-7" strokeWidth={2.25} />
          </button>
        </div>
        {RIGHT_TABS.map((tab) => (
          <TabLink key={tab.to} {...tab} />
        ))}
      </div>
    </nav>
  )
}
