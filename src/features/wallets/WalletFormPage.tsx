import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AmountSheet } from '../../components/AmountSheet'
import { Button } from '../../components/Button'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { EmptyState } from '../../components/EmptyState'
import { EntityFields, type EntityDraft } from '../../components/EntityFields'
import { PageHeader } from '../../components/PageHeader'
import { db } from '../../db/db'
import { messageOf } from '../../db/errors'
import type { Wallet } from '../../db/types'
import { createWallet, deleteWallet, isWalletUsed, setWalletArchived, updateWallet } from '../../db/wallets'
import { formatRupiah } from '../../lib/money'
import { SearchX } from 'lucide-react'

const LIST_PATH = '/pengaturan/dompet'

export function WalletFormPage() {
  const { id } = useParams()
  // `null` berarti sudah dicari tetapi tidak ada; `undefined` berarti masih memuat.
  const wallet = useLiveQuery(async () => (id ? ((await db.wallets.get(id)) ?? null) : null), [id])

  if (id && wallet === undefined) return null
  if (id && wallet === null) {
    return (
      <>
        <PageHeader title="Dompet" backTo={LIST_PATH} backLabel="Kembali ke daftar dompet" />
        <EmptyState icon={SearchX} title="Dompet tidak ditemukan" description="Mungkin sudah dihapus. Kembali ke daftar dompet." />
      </>
    )
  }
  return <WalletForm key={id ?? 'baru'} wallet={wallet ?? null} />
}

function WalletForm({ wallet }: { wallet: Wallet | null }) {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<EntityDraft>({
    name: wallet?.name ?? '',
    icon: wallet?.icon ?? 'wallet',
    color: wallet?.color ?? 'indigo',
  })
  const [startBalance, setStartBalance] = useState(wallet?.startBalance ?? 0)
  const [editingBalance, setEditingBalance] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const used = useLiveQuery(() => (wallet ? isWalletUsed(wallet.id) : Promise.resolve(false)), [wallet?.id])

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      navigate(LIST_PATH)
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(false)
    }
  }

  function save() {
    const input = { ...draft, startBalance }
    void run(() => (wallet ? updateWallet(wallet.id, input) : createWallet(input)))
  }

  return (
    <>
      <PageHeader title={wallet ? 'Ubah dompet' : 'Dompet baru'} backTo={LIST_PATH} backLabel="Kembali ke daftar dompet" />
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <EntityFields
          draft={draft}
          onChange={setDraft}
          nameLabel="Nama dompet"
          namePlaceholder="Misalnya MyBCA atau Tunai"
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted">Saldo awal</span>
          <button
            type="button"
            onClick={() => setEditingBalance(true)}
            className="flex min-h-14 items-center justify-between gap-3 rounded-control border border-line bg-surface px-4 text-left hover:bg-surface-2"
          >
            <span className="text-lg font-semibold tabular-nums">{formatRupiah(startBalance)}</span>
            <ChevronRight aria-hidden="true" className="size-5 text-muted" />
          </button>
          <p className="text-sm text-muted">Uang yang ada di dompet ini sebelum mulai mencatat.</p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-expense">
            {error}
          </p>
        )}

        <Button type="submit" block disabled={busy}>
          {wallet ? 'Simpan perubahan' : 'Simpan dompet'}
        </Button>
      </form>

      {wallet && (
        <section aria-label="Tindakan lain" className="flex flex-col gap-2 border-t border-line pt-5">
          <Button variant="secondary" block disabled={busy} onClick={() => void run(() => setWalletArchived(wallet.id, !wallet.archived))}>
            {wallet.archived ? 'Pulihkan dompet' : 'Arsipkan dompet'}
          </Button>
          {used === false && (
            <Button variant="danger" block disabled={busy} onClick={() => setConfirmDelete(true)}>
              Hapus dompet
            </Button>
          )}
          <p className="text-sm text-muted">
            {used
              ? 'Dompet ini sudah dipakai transaksi, jadi hanya bisa diarsipkan. Dompet yang diarsipkan disembunyikan dari pilihan tetapi riwayatnya tetap ada.'
              : 'Dompet yang diarsipkan disembunyikan dari pilihan dan bisa dipulihkan kapan saja.'}
          </p>
        </section>
      )}

      <AmountSheet
        open={editingBalance}
        title="Saldo awal"
        initialValue={startBalance}
        onClose={() => setEditingBalance(false)}
        onSave={setStartBalance}
      />

      {wallet && (
        <ConfirmSheet
          open={confirmDelete}
          title={`Hapus ${wallet.name}?`}
          description="Dompet ini belum pernah dipakai transaksi. Menghapusnya tidak bisa dibatalkan."
          confirmLabel="Hapus dompet"
          danger
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await deleteWallet(wallet.id)
            navigate(LIST_PATH)
          }}
        />
      )}
    </>
  )
}
