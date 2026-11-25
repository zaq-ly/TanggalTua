import { ChartPie } from 'lucide-react'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'

export function StatsPage() {
  return (
    <>
      <PageHeader title="Statistik" />
      <EmptyState
        icon={ChartPie}
        title="Belum ada data"
        description="Grafik per kategori muncul setelah ada transaksi di periode ini."
      />
    </>
  )
}
