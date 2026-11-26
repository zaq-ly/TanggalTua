import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import type { MonthTotals } from '../../domain/stats'
import { MONTHS_SHORT, formatMonth } from '../../lib/date'
import { formatRupiah, formatRupiahCompact } from '../../lib/money'

const SERIES = [
  { key: 'income', label: 'Pemasukan', color: 'var(--chart-income)' },
  { key: 'expense', label: 'Pengeluaran', color: 'var(--chart-expense)' },
] as const

function shortMonth(month: string): string {
  return MONTHS_SHORT[Number(month.slice(5, 7)) - 1] ?? month
}

function MonthTooltip({ active, payload }: TooltipContentProps) {
  const row = payload?.[0]?.payload as MonthTotals | undefined
  if (!active || !row) return null
  return (
    <div className="rounded-control border border-line bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 text-muted">{formatMonth(row.month)}</p>
      {SERIES.map((s) => (
        <p key={s.key} className="flex items-center gap-2">
          <span aria-hidden="true" className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
          <span className="font-semibold tabular-nums">{formatRupiah(row[s.key])}</span>
          <span className="text-muted">{s.label}</span>
        </p>
      ))}
    </div>
  )
}

export function MonthlyBars({ data }: { data: readonly MonthTotals[] }) {
  const isEmpty = data.every((row) => row.income === 0 && row.expense === 0)
  return (
    <div className="flex flex-col gap-3">
      <ul aria-label="Keterangan" className="flex gap-4 text-sm text-muted">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="h-48" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...data]} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barGap={2} barCategoryGap="24%">
            <CartesianGrid vertical={false} stroke="var(--line)" strokeWidth={1} />
            <XAxis
              dataKey="month"
              tickFormatter={shortMonth}
              tickLine={false}
              axisLine={{ stroke: 'var(--line)' }}
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
            />
            <YAxis
              width={56}
              tickFormatter={(v: number) => formatRupiahCompact(v)}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              allowDecimals={false}
              // Tanpa data, Recharts membuat sumbu 0–4 yang terbaca "Rp1, Rp2, ..."; cukup tampilkan Rp0.
              {...(isEmpty ? { ticks: [0], domain: [0, 1] } : {})}
            />
            <Tooltip content={MonthTooltip} cursor={{ fill: 'var(--surface-2)' }} />
            {SERIES.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color}
                maxBarSize={24}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-semibold text-accent">
          Lihat dalam tabel
        </summary>
        <table className="w-full text-sm tabular-nums">
          <caption className="sr-only">Pemasukan dan pengeluaran per bulan</caption>
          <thead>
            <tr className="text-left text-muted">
              <th scope="col" className="py-1 font-medium">Bulan</th>
              <th scope="col" className="py-1 text-right font-medium">Pemasukan</th>
              <th scope="col" className="py-1 text-right font-medium">Pengeluaran</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.map((row) => (
              <tr key={row.month}>
                <th scope="row" className="py-1.5 text-left font-medium">{formatMonth(row.month)}</th>
                <td className="py-1.5 text-right">{formatRupiah(row.income)}</td>
                <td className="py-1.5 text-right">{formatRupiah(row.expense)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
