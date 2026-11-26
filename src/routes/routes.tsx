import type { RouteObject } from 'react-router'
import { BudgetPage } from '../features/budget/BudgetPage'
import { PotFormPage } from '../features/budget/PotFormPage'
import { CategoriesPage } from '../features/categories/CategoriesPage'
import { CategoryFormPage } from '../features/categories/CategoryFormPage'
import { HomePage } from '../features/home/HomePage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { StatsPage } from '../features/stats/StatsPage'
import { HistoryPage } from '../features/transactions/HistoryPage'
import { OnboardingPage } from '../features/wallets/OnboardingPage'
import { WalletFormPage } from '../features/wallets/WalletFormPage'
import { WalletsPage } from '../features/wallets/WalletsPage'
import { AppLayout } from './AppLayout'
import { NotFoundPage } from './NotFoundPage'

export const routes: RouteObject[] = [
  { path: '/mulai', element: <OnboardingPage /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'riwayat', element: <HistoryPage /> },
      { path: 'anggaran', element: <BudgetPage /> },
      { path: 'anggaran/pos/baru', element: <PotFormPage /> },
      { path: 'anggaran/pos/:id', element: <PotFormPage /> },
      { path: 'statistik', element: <StatsPage /> },
      { path: 'pengaturan', element: <SettingsPage /> },
      { path: 'pengaturan/dompet', element: <WalletsPage /> },
      { path: 'pengaturan/dompet/baru', element: <WalletFormPage /> },
      { path: 'pengaturan/dompet/:id', element: <WalletFormPage /> },
      { path: 'pengaturan/kategori', element: <CategoriesPage /> },
      { path: 'pengaturan/kategori/baru', element: <CategoryFormPage /> },
      { path: 'pengaturan/kategori/:id', element: <CategoryFormPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
