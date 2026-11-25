import { Outlet } from 'react-router'
import { Sheet } from '../components/Sheet'
import { TabBar } from '../components/TabBar'
import { useAddSheet } from '../features/transactions/useAddSheet'

export function AppLayout() {
  const isAddOpen = useAddSheet((s) => s.isOpen)
  const closeAdd = useAddSheet((s) => s.close)

  return (
    <div className="min-h-dvh pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom)+1.5rem)]">
        <Outlet />
      </main>
      <TabBar />
      <Sheet open={isAddOpen} title="Tambah transaksi" onClose={closeAdd}>
        <p className="pb-4 text-sm text-muted">Form transaksi sedang disiapkan.</p>
      </Sheet>
    </div>
  )
}
