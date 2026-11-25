import { ReceiptText } from 'lucide-react'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'

export function HistoryPage() {
  return (
    <>
      <PageHeader title="Riwayat" />
      <EmptyState
        icon={ReceiptText}
        title="Belum ada transaksi"
        description="Ketuk tombol + di bawah untuk mencatat transaksi pertama."
      />
    </>
  )
}
