import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { EntityIcon } from '../../components/EntityIcon'
import type { BudgetPot, Rupiah } from '../../db/types'
import { formatPercentTenths, percentTenths, progressPercent, type PotUsage } from '../../domain/budget'
import { formatRupiah } from '../../lib/money'
import { colorVar } from '../../lib/palette'

interface PotCardProps {
  pot: BudgetPot
  usage: PotUsage
  totalFund: Rupiah
}

const STATUS_TEXT = { ok: 'text-muted', low: 'text-warning', over: 'text-expense' } as const

export function PotCard({ pot, usage, totalFund }: PotCardProps) {
  const percent = percentTenths(pot.amount, totalFund)
  const progress = progressPercent(usage.used, pot.amount)
  const barColor = usage.status === 'over' ? 'var(--expense)' : usage.status === 'low' ? 'var(--warning)' : colorVar(pot.color)
  const isUnlinked = usage.linkedCategoryIds.length === 0 && pot.manualUsed === undefined
  const remainingAmount = formatRupiah(Math.abs(usage.remaining))
  const remainingText = usage.remaining < 0 ? `Lebih ${remainingAmount}` : `Sisa ${remainingAmount}`
  const remainingLabel = usage.remaining < 0 ? `lebih ${remainingAmount}` : `sisa ${remainingAmount}`

  return (
    <Link
      to={`/anggaran/pos/${pot.id}`}
      aria-label={`Pos ${pot.name}: jatah ${formatRupiah(pot.amount)}, terpakai ${formatRupiah(usage.used)}, ${remainingLabel}. Ketuk untuk mengubah.`}
      className="flex flex-col gap-3 rounded-card bg-surface px-4 py-3 hover:bg-surface-2"
    >
      <div className="flex items-center gap-3">
        <EntityIcon icon={pot.icon} color={pot.color} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{pot.name}</p>
          <p className="text-sm text-muted tabular-nums">
            {formatRupiah(pot.amount)}
            {percent !== null && ` · ${formatPercentTenths(percent)}`}
          </p>
        </div>
      </div>
      <div
        role="progressbar"
        aria-label={`Pemakaian ${pot.name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        className="h-2 overflow-hidden rounded-full bg-surface-2"
      >
        <div className="h-full rounded-full bg-(--bar)" style={{ width: `${progress}%`, '--bar': barColor } as CSSProperties} />
      </div>
      <div className="flex items-baseline justify-between gap-2 text-sm tabular-nums">
        {/* Tanpa kategori dan tanpa jumlah manual, terpakai pasti Rp0; yang berguna adalah petunjuknya. */}
        <p className="min-w-0 truncate text-muted">{isUnlinked ? 'Belum ada kategori' : `Terpakai ${formatRupiah(usage.used)}`}</p>
        <p className={`shrink-0 font-semibold whitespace-nowrap ${STATUS_TEXT[usage.status]}`}>{remainingText}</p>
      </div>
    </Link>
  )
}
