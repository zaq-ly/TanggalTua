import { CalendarRange, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { monthPeriod, periodLabel, rangePeriod, shiftMonth, type Period } from '../domain/period'
import { MONTHS_SHORT, addMonths, currentMonth, isDateString, monthRange, todayDateString } from '../lib/date'
import { Button } from './Button'
import { Sheet } from './Sheet'
import { usePeriod } from './usePeriod'

const arrowClass =
  'flex size-11 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent'

export function PeriodPicker() {
  const period = usePeriod((s) => s.period)
  const setPeriod = usePeriod((s) => s.setPeriod)
  const [open, setOpen] = useState(false)
  const isMonth = period.kind === 'month'

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className={arrowClass}
        aria-label="Bulan sebelumnya"
        disabled={!isMonth}
        onClick={() => setPeriod(shiftMonth(period, -1))}
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Periode: ${periodLabel(period)}. Ketuk untuk mengganti.`}
        className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 font-semibold hover:bg-surface-2"
      >
        {!isMonth && <CalendarRange aria-hidden="true" className="size-4 shrink-0 text-muted" />}
        <span className="truncate">{periodLabel(period)}</span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted" />
      </button>
      <button
        type="button"
        className={arrowClass}
        aria-label="Bulan berikutnya"
        disabled={!isMonth}
        onClick={() => setPeriod(shiftMonth(period, 1))}
      >
        <ChevronRight aria-hidden="true" className="size-5" />
      </button>

      <Sheet open={open} title="Pilih periode" onClose={() => setOpen(false)}>
        {open && (
          <PeriodOptions
            period={period}
            onSelect={(p) => {
              setPeriod(p)
              setOpen(false)
            }}
          />
        )}
      </Sheet>
    </div>
  )
}

function PeriodOptions({ period, onSelect }: { period: Period; onSelect: (p: Period) => void }) {
  const thisMonth = currentMonth()
  const lastMonth = addMonths(thisMonth, -1)
  const selectedMonth = period.kind === 'month' ? period.month : null
  const [year, setYear] = useState(Number((selectedMonth ?? thisMonth).slice(0, 4)))
  const initialRange = period.kind === 'range' ? period : monthRange(thisMonth)
  const [start, setStart] = useState(initialRange.start)
  const [end, setEnd] = useState(period.kind === 'range' ? period.end : todayDateString())
  const [rangeError, setRangeError] = useState<string | null>(null)

  const quick = [
    { label: 'Bulan ini', month: thisMonth },
    { label: 'Bulan lalu', month: lastMonth },
  ]

  function applyRange() {
    if (!isDateString(start) || !isDateString(end)) {
      setRangeError('Isi tanggal awal dan akhir dulu.')
      return
    }
    onSelect(rangePeriod(start, end))
  }

  return (
    <div className="flex flex-col gap-6 pb-2">
      <div className="grid grid-cols-2 gap-2">
        {quick.map((q) => (
          <button
            key={q.label}
            type="button"
            aria-pressed={selectedMonth === q.month}
            onClick={() => onSelect(monthPeriod(q.month))}
            className="min-h-12 rounded-control border border-line font-semibold hover:bg-surface-2 aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent"
          >
            {q.label}
          </button>
        ))}
      </div>

      <section aria-labelledby="judul-pilih-bulan" className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 id="judul-pilih-bulan" className="font-semibold">
            Pilih bulan
          </h3>
          <div className="flex items-center">
            <button type="button" className={arrowClass} aria-label="Tahun sebelumnya" onClick={() => setYear((y) => y - 1)}>
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
            <span className="w-12 text-center font-semibold tabular-nums" aria-live="polite">
              {year}
            </span>
            <button type="button" className={arrowClass} aria-label="Tahun berikutnya" onClick={() => setYear((y) => y + 1)}>
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {MONTHS_SHORT.map((name, index) => {
            const month = `${year}-${String(index + 1).padStart(2, '0')}`
            return (
              <button
                key={month}
                type="button"
                aria-pressed={selectedMonth === month}
                aria-label={`${name} ${year}`}
                onClick={() => onSelect(monthPeriod(month))}
                className={`min-h-11 rounded-control text-sm font-medium hover:bg-surface-2 aria-pressed:bg-accent aria-pressed:text-accent-ink ${
                  month === thisMonth ? 'ring-1 ring-accent ring-inset' : ''
                }`}
              >
                {name}
              </button>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="judul-rentang" className="flex flex-col gap-2">
        <h3 id="judul-rentang" className="font-semibold">
          Rentang tanggal
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-muted">
            Dari
            <input
              type="date"
              value={start}
              onChange={(e) => {
                setStart(e.target.value)
                setRangeError(null)
              }}
              className="min-h-12 rounded-control border border-line bg-surface px-3 text-base text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-muted">
            Sampai
            <input
              type="date"
              value={end}
              onChange={(e) => {
                setEnd(e.target.value)
                setRangeError(null)
              }}
              className="min-h-12 rounded-control border border-line bg-surface px-3 text-base text-ink"
            />
          </label>
        </div>
        {rangeError && (
          <p role="alert" className="text-sm text-expense">
            {rangeError}
          </p>
        )}
        <Button variant="secondary" block onClick={applyRange}>
          Terapkan rentang
        </Button>
      </section>
    </div>
  )
}
