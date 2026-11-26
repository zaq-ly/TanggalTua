import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, type TooltipContentProps } from 'recharts'
import type { Rupiah } from '../../db/types'
import { formatPercentTenths } from '../../domain/budget'
import type { Slice } from '../../domain/stats'
import { formatRupiah, formatRupiahCompact } from '../../lib/money'
import { sliceColor } from './sliceColor'

interface CategoryDonutProps {
  slices: readonly Slice[]
  total: Rupiah
  totalLabel: string
}

function SliceTooltip({ active, payload }: TooltipContentProps) {
  const slice = payload?.[0]?.payload as Slice | undefined
  if (!active || !slice) return null
  return (
    <div className="rounded-control border border-line bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold tabular-nums">{formatRupiah(slice.total)}</p>
      <p className="flex items-center gap-1.5 text-muted">
        <span aria-hidden="true" className="h-0.5 w-3 rounded-full" style={{ background: sliceColor(slice) }} />
        {slice.label} · {formatPercentTenths(slice.shareTenths)}
      </p>
    </div>
  )
}

/** Donat sebagai gambaran sekilas; angka lengkapnya ada di daftar kategori di bawahnya. */
export function CategoryDonut({ slices, total, totalLabel }: CategoryDonutProps) {
  return (
    <figure className="relative mx-auto aspect-square w-full max-w-60" aria-label={`${totalLabel} ${formatRupiah(total)}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={[...slices]}
            dataKey="total"
            nameKey="label"
            innerRadius="64%"
            outerRadius="98%"
            startAngle={90}
            endAngle={-270}
            // Celah 2px warna permukaan antarpotong, bukan garis tepi berwarna.
            stroke="var(--surface)"
            strokeWidth={slices.length > 1 ? 2 : 0}
            isAnimationActive={false}
          >
            {slices.map((slice) => (
              <Cell key={slice.key} fill={sliceColor(slice)} />
            ))}
          </Pie>
          <Tooltip content={SliceTooltip} cursor={false} />
        </PieChart>
      </ResponsiveContainer>
      <figcaption className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs text-muted">{totalLabel}</span>
        <span className="text-xl font-semibold tabular-nums">{formatRupiahCompact(total)}</span>
      </figcaption>
    </figure>
  )
}
