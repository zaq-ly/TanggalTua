import { useLiveQuery } from 'dexie-react-hooks'
import { SearchX, Wallet as WalletIcon } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '../../components/EmptyState'
import { Sheet } from '../../components/Sheet'
import { db } from '../../db/db'
import { bySort } from '../../domain/ordering'
import { preferredWalletId, toDraft, type TransactionDraft } from '../../domain/transactions'
import { todayDateString } from '../../lib/date'
import { TransactionForm } from './TransactionForm'
import { useAddSheet } from './useAddSheet'

export function TransactionSheet() {
  const isOpen = useAddSheet((s) => s.isOpen)
  const editingId = useAddSheet((s) => s.editingId)
  const close = useAddSheet((s) => s.close)

  return (
    <Sheet open={isOpen} title={editingId ? 'Ubah transaksi' : 'Tambah transaksi'} onClose={close}>
      {isOpen && <TransactionSheetBody key={editingId ?? 'baru'} editingId={editingId} onDone={close} />}
    </Sheet>
  )
}

function TransactionSheetBody({ editingId, onDone }: { editingId: string | null; onDone: () => void }) {
  const data = useLiveQuery(async () => {
    const [wallets, categories, latest, existing] = await Promise.all([
      db.wallets.toArray(),
      db.categories.toArray(),
      db.transactions.orderBy('createdAt').reverse().limit(20).toArray(),
      editingId ? db.transactions.get(editingId) : Promise.resolve(undefined),
    ])
    return { wallets: wallets.sort(bySort), categories: categories.sort(bySort), latest, existing: existing ?? null }
  }, [editingId])

  if (!data) return null

  const activeWallets = data.wallets.filter((w) => !w.archived)

  if (editingId && !data.existing) {
    return (
      <EmptyState
        icon={SearchX}
        title="Transaksi tidak ditemukan"
        description="Mungkin sudah dihapus. Tutup lembar ini dan pilih transaksi lain."
      />
    )
  }

  if (!data.existing && activeWallets.length === 0) {
    return (
      <EmptyState
        icon={WalletIcon}
        title="Belum ada dompet"
        description="Transaksi dicatat ke sebuah dompet. Buat dompet pertama dulu."
        action={
          <Link
            to={data.wallets.length === 0 ? '/mulai' : '/pengaturan/dompet/baru'}
            onClick={onDone}
            className="flex min-h-11 items-center rounded-control bg-accent px-5 font-semibold text-accent-ink"
          >
            Buat dompet
          </Link>
        }
      />
    )
  }

  let initial: TransactionDraft
  if (data.existing) {
    initial = toDraft(data.existing)
  } else {
    const walletId = preferredWalletId(data.latest, activeWallets)
    initial = {
      type: 'expense',
      amount: 0,
      date: todayDateString(),
      walletId,
      fromWalletId: walletId,
      toWalletId: activeWallets.find((w) => w.id !== walletId)?.id,
    }
  }

  return (
    <TransactionForm
      initial={initial}
      existing={data.existing}
      wallets={data.wallets}
      categories={data.categories}
      onDone={onDone}
    />
  )
}
