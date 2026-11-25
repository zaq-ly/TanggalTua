import { PiggyBank } from 'lucide-react'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'

export function BudgetPage() {
  return (
    <>
      <PageHeader title="Anggaran" />
      <EmptyState
        icon={PiggyBank}
        title="Belum ada anggaran bulan ini"
        description="Isi total dana bulan ini, lalu bagi ke pos seperti Kebutuhan dan Tabungan."
      />
    </>
  )
}
