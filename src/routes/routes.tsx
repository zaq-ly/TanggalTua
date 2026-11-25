import type { RouteObject } from 'react-router'
import { BudgetPage } from '../features/budget/BudgetPage'
import { HomePage } from '../features/home/HomePage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { StatsPage } from '../features/stats/StatsPage'
import { HistoryPage } from '../features/transactions/HistoryPage'
import { AppLayout } from './AppLayout'
import { NotFoundPage } from './NotFoundPage'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'riwayat', element: <HistoryPage /> },
      { path: 'anggaran', element: <BudgetPage /> },
      { path: 'statistik', element: <StatsPage /> },
      { path: 'pengaturan', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
