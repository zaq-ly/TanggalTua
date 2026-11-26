import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronRight, SearchX } from 'lucide-react'
import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { AmountSheet } from '../../components/AmountSheet'
import { Button } from '../../components/Button'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { EmptyState } from '../../components/EmptyState'
import { EntityFields, type EntityDraft } from '../../components/EntityFields'
import { EntityIcon } from '../../components/EntityIcon'
import { PageHeader } from '../../components/PageHeader'
import { useGoBack } from '../../components/useGoBack'
import { deletePot, savePot } from '../../db/budgets'
import { db } from '../../db/db'
import { messageOf } from '../../db/errors'
import type { Budget, BudgetPot, Category, MonthString } from '../../db/types'
import { amountFromPercent, formatPercentTenths, percentTenths } from '../../domain/budget'
import { bySort } from '../../domain/ordering'
import { currentMonth, formatMonth, isMonthString } from '../../lib/date'
import { formatRupiah } from '../../lib/money'

const BACK = '/anggaran'

export function PotFormPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const paramMonth = params.get('bulan')
  const newMonth: MonthString = paramMonth && isMonthString(paramMonth) ? paramMonth : currentMonth()

  const data = useLiveQuery(async () => {
    const pot = id ? ((await db.budgetPots.get(id)) ?? null) : null
    const budget = pot
      ? await db.budgets.get(pot.budgetId)
      : await db.budgets.where('month').equals(newMonth).first()
    const [categories, allPots] = await Promise.all([db.categories.where('kind').equals('expense').toArray(), db.budgetPots.toArray()])
    return { pot, budget: budget ?? null, categories: categories.sort(bySort), allPots }
  }, [id, newMonth])

  if (!data) return null
  if (id && !data.pot) {
    return (
      <>
        <PageHeader title="Pos" backTo={BACK} />
        <EmptyState icon={SearchX} title="Pos tidak ditemukan" description="Mungkin sudah dihapus. Kembali ke Anggaran." />
      </>
    )
  }
  const month = data.budget?.month ?? newMonth
  return <PotForm key={id ?? `baru-${month}`} month={month} {...data} />
}

interface PotFormProps {
  month: MonthString
  pot: BudgetPot | null
  budget: Budget | null
  categories: Category[]
  allPots: BudgetPot[]
}

function PotForm({ month, pot, budget, categories, allPots }: PotFormProps) {
  const goBack = useGoBack(BACK)
  const totalFund = budget?.totalFund ?? 0
  const [draft, setDraft] = useState<EntityDraft>({
    name: pot?.name ?? '',
    icon: pot?.icon ?? 'piggy-bank',
    color: pot?.color ?? 'indigo',
  })
  const [amount, setAmount] = useState(pot?.amount ?? 0)
  const [selected, setSelected] = useState<string[]>(() =>
    pot ? categories.filter((c) => c.budgetPotId === pot.key).map((c) => c.id) : [],
  )
  const [manualUsed, setManualUsed] = useState(pot?.manualUsed ?? 0)
  const [sheet, setSheet] = useState<'nominal' | 'persen' | 'manual' | 'hapus' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Nama pos lain per key (yang terbaru), untuk keterangan "sekarang di pos X".
  const potNameByKey = new Map<string, string>()
  for (const p of allPots) potNameByKey.set(p.key, p.name)
  const visibleCategories = categories.filter((c) => !c.archived || selected.includes(c.id))
  const percent = percentTenths(amount, totalFund)

  function toggle(categoryId: string) {
    setSelected((list) => (list.includes(categoryId) ? list.filter((x) => x !== categoryId) : [...list, categoryId]))
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await savePot({ month, id: pot?.id, input: { ...draft, amount }, categoryIds: selected, manualUsed })
      goBack()
    } catch (e) {
      setError(messageOf(e))
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title={pot ? 'Ubah pos' : 'Pos baru'} backTo={BACK} />
      <p className="-mt-2 text-sm text-muted">Anggaran {formatMonth(month)}</p>

      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <EntityFields draft={draft} onChange={setDraft} nameLabel="Nama pos" namePlaceholder="Misalnya Kebutuhan atau Sepeda" />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted">Jatah</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSheet('nominal')}
              aria-label={`Jatah dalam rupiah: ${formatRupiah(amount)}. Ketuk untuk mengubah.`}
              className="flex min-h-14 flex-col justify-center rounded-control border border-line bg-surface px-4 text-left hover:bg-surface-2"
            >
              <span className="text-xs text-muted">Nominal</span>
              <span className="font-semibold tabular-nums">{formatRupiah(amount)}</span>
            </button>
            <button
              type="button"
              onClick={() => setSheet('persen')}
              disabled={totalFund === 0}
              aria-label={
                percent === null
                  ? 'Jatah dalam persen tidak tersedia karena total dana belum diisi.'
                  : `Jatah dalam persen: ${formatPercentTenths(percent)} dari total dana. Ketuk untuk mengubah.`
              }
              className="flex min-h-14 flex-col justify-center rounded-control border border-line bg-surface px-4 text-left hover:bg-surface-2 disabled:opacity-50"
            >
              <span className="text-xs text-muted">Persen</span>
              <span className="font-semibold tabular-nums">{percent === null ? '–' : formatPercentTenths(percent)}</span>
            </button>
          </div>
          <p className="text-sm text-muted">
            {totalFund === 0
              ? 'Isi total dana bulan ini di halaman Anggaran supaya jatah bisa diisi dalam persen.'
              : `Dari total dana ${formatRupiah(totalFund)}.`}
          </p>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium text-muted">Kategori pengeluaran yang mengurangi pos ini</legend>
          <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface">
            {visibleCategories.map((c) => {
              const checked = selected.includes(c.id)
              const elsewhere = c.budgetPotId && c.budgetPotId !== pot?.key ? potNameByKey.get(c.budgetPotId) : undefined
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggle(c.id)}
                    className="flex min-h-14 w-full items-center gap-3 px-3 text-left hover:bg-surface-2"
                  >
                    <EntityIcon icon={c.icon} color={c.color} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c.name}</span>
                      {elsewhere && (
                        <span className="block truncate text-sm text-muted">
                          {checked ? `Akan dipindah dari ${elsewhere}` : `Sekarang di ${elsewhere}`}
                        </span>
                      )}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`flex size-6 items-center justify-center rounded-md border-2 ${checked ? 'border-accent bg-accent text-accent-ink' : 'border-line'}`}
                    >
                      {checked && <Check className="size-4" strokeWidth={3} />}
                    </span>
                  </button>
                </li>
              )
            })}
            {visibleCategories.length === 0 && (
              <li className="px-4 py-4 text-sm text-muted">Belum ada kategori pengeluaran. Tambahkan di Pengaturan, Kategori.</li>
            )}
          </ul>
          <p className="text-sm text-muted">Kaitan ini berlaku untuk pos yang sama di semua bulan.</p>
        </fieldset>

        {selected.length === 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-muted">Sudah disisihkan</span>
            <button
              type="button"
              onClick={() => setSheet('manual')}
              aria-label={`Sudah disisihkan: ${formatRupiah(manualUsed)}. Ketuk untuk mengubah.`}
              className="flex min-h-14 items-center justify-between gap-3 rounded-control border border-line bg-surface px-4 text-left hover:bg-surface-2"
            >
              <span className="font-semibold tabular-nums">{formatRupiah(manualUsed)}</span>
              <ChevronRight aria-hidden="true" className="size-5 text-muted" />
            </button>
            <div className="flex gap-2">
              <Button variant="ghost" className="min-h-11 px-3 text-sm" disabled={amount === 0} onClick={() => setManualUsed(amount)}>
                Tandai sudah disisihkan penuh
              </Button>
              {manualUsed > 0 && (
                <Button variant="ghost" className="min-h-11 px-3 text-sm" onClick={() => setManualUsed(0)}>
                  Kosongkan
                </Button>
              )}
            </div>
            <p className="text-sm text-muted">
              Untuk pos tanpa kategori, misalnya tabungan yang dipindah ke rekening lain.
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-expense">
            {error}
          </p>
        )}

        <Button type="submit" block disabled={busy}>
          {pot ? 'Simpan perubahan' : 'Simpan pos'}
        </Button>
      </form>

      {pot && (
        <section aria-label="Tindakan lain" className="flex flex-col gap-2 border-t border-line pt-5">
          <Button variant="danger" block onClick={() => setSheet('hapus')}>
            Hapus pos
          </Button>
        </section>
      )}

      <AmountSheet
        open={sheet === 'nominal'}
        title="Jatah pos"
        initialValue={amount}
        quickAmounts={[50_000, 100_000, 500_000]}
        describe={totalFund > 0 ? (v) => `${formatPercentTenths(percentTenths(v, totalFund) ?? 0)} dari total dana` : undefined}
        onClose={() => setSheet(null)}
        onSave={setAmount}
      />
      <AmountSheet
        open={sheet === 'persen'}
        title="Jatah dalam persen"
        initialValue={percent === null ? 0 : Math.round(percent / 10)}
        max={100}
        format={(v) => `${v}%`}
        describe={(v) => `${formatRupiah(amountFromPercent(v, totalFund))} dari ${formatRupiah(totalFund)}`}
        onClose={() => setSheet(null)}
        onSave={(v) => setAmount(amountFromPercent(v, totalFund))}
      />
      <AmountSheet
        open={sheet === 'manual'}
        title="Sudah disisihkan"
        initialValue={manualUsed}
        onClose={() => setSheet(null)}
        onSave={setManualUsed}
      />
      {pot && (
        <ConfirmSheet
          open={sheet === 'hapus'}
          title={`Hapus pos ${pot.name}?`}
          description={`Pos ini dihapus dari anggaran ${formatMonth(month)}. Pos di bulan lain dan semua transaksi tidak terpengaruh.`}
          confirmLabel="Hapus pos"
          danger
          onClose={() => setSheet(null)}
          onConfirm={async () => {
            await deletePot(pot.id)
            goBack()
          }}
        />
      )}
    </>
  )
}
