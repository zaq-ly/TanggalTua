import { useLiveQuery } from 'dexie-react-hooks'
import { Copy, LayoutTemplate, PencilLine, Plus, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { AmountSheet } from '../../components/AmountSheet'
import { PageHeader } from '../../components/PageHeader'
import { PeriodPicker } from '../../components/PeriodPicker'
import { usePeriod } from '../../components/usePeriod'
import { useSnackbar } from '../../components/useSnackbar'
import { applyTemplate, copyFromPrevious, previousBudgetWithPots, setTotalFund } from '../../db/budgets'
import { db } from '../../db/db'
import { messageOf } from '../../db/errors'
import { potUsage, unallocated } from '../../domain/budget'
import { budgetMonth } from '../../domain/period'
import { formatMonth, monthRange } from '../../lib/date'
import { formatRupiah } from '../../lib/money'
import { PotCard } from './PotCard'

export function BudgetPage() {
  const period = usePeriod((s) => s.period)
  const month = budgetMonth(period)
  const range = monthRange(month)
  const showSnackbar = useSnackbar((s) => s.show)
  const [editingFund, setEditingFund] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const data = useLiveQuery(async () => {
    const budget = await db.budgets.where('month').equals(month).first()
    const [pots, categories, transactions, previous] = await Promise.all([
      budget ? db.budgetPots.where('budgetId').equals(budget.id).sortBy('sort') : Promise.resolve([]),
      db.categories.toArray(),
      db.transactions.where('date').between(range.start, range.end, true, true).toArray(),
      previousBudgetWithPots(month),
    ])
    return { budget, pots, categories, transactions, previous }
  }, [month])

  async function run(action: () => Promise<unknown>, success?: string) {
    setError(null)
    try {
      await action()
      if (success) showSnackbar(success)
    } catch (e) {
      setError(messageOf(e))
    }
  }

  const header = (
    <>
      <PageHeader title="Anggaran" />
      <PeriodPicker />
      {period.kind === 'range' && (
        <p className="-mt-2 text-center text-sm text-muted">Anggaran dihitung per bulan. Menampilkan {formatMonth(month)}.</p>
      )}
    </>
  )
  if (!data) return header

  const totalFund = data.budget?.totalFund ?? 0
  const rest = unallocated(totalFund, data.pots)
  const allocated = totalFund - rest
  const newPotHref = `/anggaran/pos/baru?bulan=${month}`

  return (
    <>
      {header}

      <section aria-label="Total dana" className="flex flex-col gap-3 rounded-card bg-surface px-4 py-4">
        <button
          type="button"
          onClick={() => setEditingFund(true)}
          aria-label={`Total dana ${formatMonth(month)}: ${formatRupiah(totalFund)}. Ketuk untuk mengubah.`}
          className="-mx-2 flex items-center justify-between gap-2 rounded-control px-2 py-1 text-left hover:bg-surface-2"
        >
          <span>
            <span className="block text-sm text-muted">Total dana</span>
            <span className="block text-2xl font-semibold tracking-tight tabular-nums">{formatRupiah(totalFund)}</span>
          </span>
          <PencilLine aria-hidden="true" className="size-5 text-muted" />
        </button>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-muted">Teralokasi</dt>
            <dd className="font-semibold tabular-nums">{formatRupiah(allocated)}</dd>
          </div>
          <div>
            <dt className="text-muted">Belum dialokasikan</dt>
            <dd className={`font-semibold tabular-nums ${rest < 0 ? 'text-expense' : ''}`}>{formatRupiah(rest)}</dd>
          </div>
        </dl>
        {rest < 0 && (
          <p role="alert" className="flex items-start gap-2 rounded-control bg-surface-2 px-3 py-2 text-sm text-expense">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Pos melebihi total dana sebesar {formatRupiah(-rest)}. Kurangi jatah pos atau naikkan total dana.
          </p>
        )}
      </section>

      {error && (
        <p role="alert" className="text-sm text-expense">
          {error}
        </p>
      )}

      {data.pots.length === 0 ? (
        <section aria-labelledby="judul-mulai-pos" className="flex flex-col gap-2 rounded-card border border-dashed border-line bg-surface px-4 py-4">
          <h2 id="judul-mulai-pos" className="font-semibold">
            Bagi dana ke pos
          </h2>
          <p className="text-sm text-muted">
            {totalFund === 0
              ? 'Isi total dana dulu, lalu bagi ke pos seperti Kebutuhan dan Tabungan.'
              : `Bagi ${formatRupiah(totalFund)} ke pos seperti Kebutuhan dan Tabungan.`}
          </p>
          {data.previous && (
            <StartOption
              icon={Copy}
              label={`Salin dari ${formatMonth(data.previous.month)}`}
              onClick={() => void run(() => copyFromPrevious(month), 'Pos bulan lalu disalin.')}
            />
          )}
          <StartOption
            icon={LayoutTemplate}
            label="Pakai template 50/30/20"
            hint={totalFund === 0 ? 'Isi total dana dulu' : 'Kebutuhan 50%, Keinginan 30%, Tabungan 20%'}
            disabled={totalFund === 0}
            onClick={() => void run(() => applyTemplate(month, '50-30-20'), 'Template 50/30/20 dipakai.')}
          />
          <Link
            to={newPotHref}
            className="flex min-h-12 items-center gap-3 rounded-control px-2 font-medium text-accent hover:bg-accent-soft"
          >
            <Plus aria-hidden="true" className="size-5" />
            Mulai kosong, tambah pos sendiri
          </Link>
        </section>
      ) : (
        <section aria-labelledby="judul-pos" className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 id="judul-pos" className="font-semibold">
              Pos
            </h2>
            <Link to={newPotHref} className="flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-accent">
              <Plus aria-hidden="true" className="size-4" />
              Tambah pos
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {data.pots.map((pot) => (
              <li key={pot.id}>
                <PotCard pot={pot} usage={potUsage(pot, data.categories, data.transactions, range)} totalFund={totalFund} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <AmountSheet
        open={editingFund}
        title={`Total dana ${formatMonth(month)}`}
        initialValue={totalFund}
        quickAmounts={[100_000, 500_000, 1_000_000]}
        onClose={() => setEditingFund(false)}
        onSave={(value) => void run(() => setTotalFund(month, value))}
      />
    </>
  )
}

interface StartOptionProps {
  icon: typeof Copy
  label: string
  hint?: string
  disabled?: boolean
  onClick: () => void
}

function StartOption({ icon: Icon, label, hint, disabled = false, onClick }: StartOptionProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-12 items-center gap-3 rounded-control px-2 text-left hover:bg-surface-2 disabled:opacity-50 disabled:hover:bg-transparent"
    >
      <Icon aria-hidden="true" className="size-5 shrink-0 text-accent" />
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
    </button>
  )
}
