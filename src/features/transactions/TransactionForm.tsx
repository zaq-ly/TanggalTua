import { ArrowRight, CalendarDays, ChevronDown, Receipt, StickyNote } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { AmountSheet } from '../../components/AmountSheet'
import { Button } from '../../components/Button'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { EntityIcon } from '../../components/EntityIcon'
import { Keypad } from '../../components/Keypad'
import { Sheet } from '../../components/Sheet'
import { TextField } from '../../components/TextField'
import { useSnackbar } from '../../components/useSnackbar'
import { messageOf } from '../../db/errors'
import { addTransaction, deleteTransaction, restoreTransaction, updateTransaction } from '../../db/transactions'
import type { Category, Transaction, TransactionType, Wallet } from '../../db/types'
import { NOTE_MAX_LENGTH, type TransactionDraft } from '../../domain/transactions'
import { isDateString, relativeDayLabel } from '../../lib/date'
import { formatRupiah } from '../../lib/money'
import { Chip } from './Chip'
import { WalletPickerSheet } from './WalletPickerSheet'

const TYPES: readonly { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
  { value: 'transfer', label: 'Transfer' },
]

const QUICK_AMOUNTS = [10_000, 50_000] as const

type Picker = 'wallet' | 'from' | 'to' | 'fee' | 'note' | 'delete' | null

interface TransactionFormProps {
  initial: TransactionDraft
  existing: Transaction | null
  /** Semua dompet dan kategori, terurut; yang diarsipkan hanya ditampilkan bila sedang terpilih. */
  wallets: readonly Wallet[]
  categories: readonly Category[]
  onDone: () => void
}

export function TransactionForm({ initial, existing, wallets, categories, onDone }: TransactionFormProps) {
  const showSnackbar = useSnackbar((s) => s.show)
  const [draft, setDraft] = useState<TransactionDraft>(initial)
  const [adminFee, setAdminFee] = useState(0)
  const [picker, setPicker] = useState<Picker>(null)
  const [noteDraft, setNoteDraft] = useState(initial.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const walletById = new Map(wallets.map((w) => [w.id, w]))
  const visibleWallets = wallets.filter(
    (w) => !w.archived || [draft.walletId, draft.fromWalletId, draft.toWalletId].includes(w.id),
  )
  const visibleCategories =
    draft.type === 'transfer'
      ? []
      : categories.filter((c) => c.kind === draft.type && (!c.archived || c.id === draft.categoryId))
  const isTransfer = draft.type === 'transfer'
  // Biaya admin hanya untuk transfer baru: setelah tersimpan ia pengeluaran mandiri (keputusan pemilik).
  const canAddFee = isTransfer && existing === null

  function update(patch: Partial<TransactionDraft>) {
    setDraft((d) => ({ ...d, ...patch }))
    setError(null)
  }

  function changeType(type: TransactionType) {
    const keepCategory = categories.find((c) => c.id === draft.categoryId)?.kind === type
    update({
      type,
      categoryId: keepCategory ? draft.categoryId : undefined,
      // Pindah antarjenis tetap memakai dompet yang sama supaya tidak perlu memilih ulang.
      walletId: draft.walletId ?? draft.fromWalletId,
      fromWalletId: draft.fromWalletId ?? draft.walletId,
    })
  }

  function onTypeKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (step === 0) return
    event.preventDefault()
    const index = TYPES.findIndex((t) => t.value === draft.type)
    const next = TYPES[(index + step + TYPES.length) % TYPES.length]
    if (next) {
      changeType(next.value)
      event.currentTarget.querySelector<HTMLButtonElement>(`[data-type="${next.value}"]`)?.focus()
    }
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      if (existing) {
        await updateTransaction(existing.id, draft)
        showSnackbar('Perubahan disimpan.')
      } else {
        const result = await addTransaction(draft, { adminFee: canAddFee ? adminFee : 0 })
        showSnackbar(result.feeId ? 'Transfer dan biaya admin disimpan.' : 'Transaksi disimpan.')
      }
      onDone()
    } catch (e) {
      setError(messageOf(e))
      setBusy(false)
    }
  }

  async function remove() {
    if (!existing) return
    const deleted = await deleteTransaction(existing.id)
    onDone()
    showSnackbar('Transaksi dihapus.', { label: 'Urungkan', run: () => restoreTransaction(deleted) })
  }

  function walletChip(id: string | undefined, placeholder: string, target: Picker, label: string) {
    const w = id ? walletById.get(id) : undefined
    return (
      <Chip
        aria-label={`${label}: ${w?.name ?? 'belum dipilih'}. Ketuk untuk mengganti.`}
        onClick={() => setPicker(target)}
        icon={w ? <WalletDot wallet={w} /> : undefined}
        className={w ? '' : 'border-dashed text-muted'}
      >
        {w?.name ?? placeholder}
        <ChevronDown aria-hidden="true" className="ml-0.5 inline size-4 text-muted" />
      </Chip>
    )
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <div
        role="radiogroup"
        aria-label="Jenis transaksi"
        onKeyDown={onTypeKeyDown}
        className="grid grid-cols-3 gap-1 rounded-control bg-surface-2 p-1"
      >
        {TYPES.map((t) => {
          const selected = t.value === draft.type
          return (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={selected}
              data-type={t.value}
              tabIndex={selected ? 0 : -1}
              onClick={() => changeType(t.value)}
              className="min-h-10 rounded-[calc(var(--radius-control)-0.25rem)] text-sm font-semibold text-muted aria-checked:bg-surface aria-checked:text-ink aria-checked:shadow-sm"
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <output
        aria-label="Jumlah"
        className={`block text-center text-4xl font-semibold tracking-tight tabular-nums ${
          draft.amount === 0
            ? 'text-muted'
            : draft.type === 'income'
              ? 'text-income'
              : draft.type === 'expense'
                ? 'text-expense'
                : 'text-ink'
        }`}
      >
        {formatRupiah(draft.amount)}
      </output>

      {/* Satu baris yang bisa digeser, supaya tombol Simpan tetap terlihat tanpa menggulir di layar 360 px. */}
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&>*]:shrink-0">
        {isTransfer ? (
          <>
            {walletChip(draft.fromWalletId, 'Dari', 'from', 'Dompet asal')}
            <ArrowRight aria-hidden="true" className="size-4 text-muted" />
            {walletChip(draft.toWalletId, 'Ke', 'to', 'Dompet tujuan')}
          </>
        ) : (
          walletChip(draft.walletId, 'Pilih dompet', 'wallet', 'Dompet')
        )}
        <DateChip value={draft.date} onChange={(date) => update({ date })} />
        <Chip
          onClick={() => {
            setNoteDraft(draft.note ?? '')
            setPicker('note')
          }}
          icon={<StickyNote aria-hidden="true" className="size-4 text-muted" />}
          aria-label={draft.note ? `Catatan: ${draft.note}. Ketuk untuk mengubah.` : 'Tambah catatan'}
          className={draft.note ? 'max-w-40' : 'w-11 justify-center px-0'}
        >
          {draft.note ?? ''}
        </Chip>
        {canAddFee && (
          <Chip
            onClick={() => setPicker('fee')}
            icon={<Receipt aria-hidden="true" className="size-4 text-muted" />}
            aria-label={`Biaya admin: ${formatRupiah(adminFee)}. Ketuk untuk mengubah.`}
          >
            {adminFee > 0 ? `Biaya ${formatRupiah(adminFee)}` : 'Biaya admin'}
          </Chip>
        )}
      </div>

      {!isTransfer && (
        <div
          role="radiogroup"
          aria-label="Kategori"
          className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
        >
          {visibleCategories.map((c) => {
            const selected = c.id === draft.categoryId
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update({ categoryId: c.id })}
                className="flex min-h-12 shrink-0 snap-start items-center gap-2 rounded-full border border-line bg-surface py-1 pr-4 pl-1 text-sm font-medium aria-checked:border-accent aria-checked:bg-accent-soft"
              >
                <EntityIcon icon={c.icon} color={c.color} size="sm" />
                {c.name}
              </button>
            )
          })}
          {visibleCategories.length === 0 && (
            <p className="py-3 text-sm text-muted">
              Belum ada kategori {draft.type === 'income' ? 'pemasukan' : 'pengeluaran'}. Tambahkan di Pengaturan, Kategori.
            </p>
          )}
        </div>
      )}

      <Keypad value={draft.amount} onChange={(amount) => update({ amount })} quickAmounts={QUICK_AMOUNTS} />

      {error && (
        <p role="alert" className="text-center text-sm text-expense">
          {error}
        </p>
      )}

      <Button type="submit" block disabled={busy}>
        {existing ? 'Simpan perubahan' : 'Simpan transaksi'}
      </Button>
      {existing && (
        <Button variant="danger" block onClick={() => setPicker('delete')}>
          Hapus transaksi
        </Button>
      )}

      <WalletPickerSheet
        open={picker === 'wallet' || picker === 'from' || picker === 'to'}
        title={picker === 'from' ? 'Dompet asal' : picker === 'to' ? 'Dompet tujuan' : 'Pilih dompet'}
        wallets={visibleWallets}
        selectedId={picker === 'from' ? draft.fromWalletId : picker === 'to' ? draft.toWalletId : draft.walletId}
        disabledId={picker === 'to' ? draft.fromWalletId : picker === 'from' ? draft.toWalletId : undefined}
        onClose={() => setPicker(null)}
        onSelect={(id) => {
          if (picker === 'from') update({ fromWalletId: id })
          else if (picker === 'to') update({ toWalletId: id })
          else update({ walletId: id })
        }}
      />

      <AmountSheet
        open={picker === 'fee'}
        title="Biaya admin"
        initialValue={adminFee}
        onClose={() => setPicker(null)}
        onSave={setAdminFee}
      />

      <Sheet open={picker === 'note'} title="Catatan" onClose={() => setPicker(null)}>
        <div className="flex flex-col gap-4 pb-2">
          <TextField
            label="Catatan"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            maxLength={NOTE_MAX_LENGTH}
            placeholder="Misalnya kopi susu sama teman"
            hint="Catatan bisa dicari di Riwayat."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                update({ note: noteDraft.trim() || undefined })
                setPicker(null)
              }
            }}
          />
          <Button
            block
            onClick={() => {
              update({ note: noteDraft.trim() || undefined })
              setPicker(null)
            }}
          >
            Simpan catatan
          </Button>
        </div>
      </Sheet>

      <ConfirmSheet
        open={picker === 'delete'}
        title="Hapus transaksi ini?"
        description={`${formatRupiah(draft.amount)} pada ${relativeDayLabel(draft.date).toLowerCase()} akan dihapus. Kamu masih bisa mengurungkannya sesaat setelah menghapus.`}
        confirmLabel="Hapus transaksi"
        danger
        onClose={() => setPicker(null)}
        onConfirm={remove}
      />
    </form>
  )
}

function WalletDot({ wallet }: { wallet: Wallet }) {
  return <EntityIcon icon={wallet.icon} color={wallet.color} size="xs" />
}

function DateChip({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  return (
    <span className="relative inline-flex rounded-full outline-offset-2 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-accent">
      <span
        aria-hidden="true"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-medium"
      >
        <CalendarDays className="size-4 text-muted" />
        {relativeDayLabel(value)}
      </span>
      <input
        type="date"
        aria-label="Tanggal transaksi"
        value={value}
        required
        onChange={(e) => {
          if (isDateString(e.target.value)) onChange(e.target.value)
        }}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker()
          } catch {
            // Browser lama tanpa showPicker tetap bisa mengetik tanggal lewat input bawaan.
          }
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </span>
  )
}
