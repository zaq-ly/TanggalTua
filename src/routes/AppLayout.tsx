import { Outlet } from 'react-router'
import { Snackbar } from '../components/Snackbar'
import { TabBar } from '../components/TabBar'
import { TransactionSheet } from '../features/transactions/TransactionSheet'

export function AppLayout() {
  return (
    <div className="min-h-dvh pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 pb-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom)+1.5rem)]">
        <Outlet />
      </main>
      <TabBar />
      <TransactionSheet />
      <Snackbar />
    </div>
  )
}
