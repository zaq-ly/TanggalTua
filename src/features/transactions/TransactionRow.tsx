import { ArrowLeftRight } from 'lucide-react'
import { EntityIcon } from '../../components/EntityIcon'
import type { Category, Transaction, Wallet } from '../../db/types'
import { formatRupiah } from '../../lib/money'

interface TransactionRowProps {
  tx: Transaction
  wallets: ReadonlyMap<string, Wallet>
  categories: ReadonlyMap<string, Category>
  onOpen: (id: string) => void
}

export function TransactionRow({ tx, wallets, categories, onOpen }: TransactionRowProps) {
  const isTransfer = tx.type === 'transfer'
  const category = tx.categoryId ? categories.get(tx.categoryId) : undefined
  const title = isTransfer ? 'Transfer' : (category?.name ?? 'Tanpa kategori')
  const walletText = isTransfer
    ? `${wallets.get(tx.fromWalletId ?? '')?.name ?? '?'} → ${wallets.get(tx.toWalletId ?? '')?.name ?? '?'}`
    : (wallets.get(tx.walletId ?? '')?.name ?? '?')
  const amountText = isTransfer
    ? formatRupiah(tx.amount)
    : `${tx.type === 'income' ? '+' : '-'}${formatRupiah(tx.amount)}`
  const amountClass = tx.type === 'income' ? 'text-income' : tx.type === 'expense' ? 'text-ink' : 'text-muted'
  const typeLabel = tx.type === 'income' ? 'Pemasukan' : tx.type === 'expense' ? 'Pengeluaran' : 'Transfer'

  return (
    <button
      type="button"
      onClick={() => onOpen(tx.id)}
      aria-label={`${typeLabel} ${title}, ${formatRupiah(tx.amount)}, ${walletText}${tx.note ? `, ${tx.note}` : ''}. Ketuk untuk mengubah.`}
      className="flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-2"
    >
      {isTransfer ? (
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
          <ArrowLeftRight className="size-5" />
        </span>
      ) : (
        <EntityIcon icon={category?.icon ?? 'tag'} color={category?.color ?? 'slate'} />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        <span className="block truncate text-sm text-muted">
          {walletText}
          {tx.note && ` · ${tx.note}`}
        </span>
      </span>
      <span className={`shrink-0 font-semibold tabular-nums ${amountClass}`}>{amountText}</span>
    </button>
  )
}
