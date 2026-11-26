import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronRight, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { AmountSheet } from '../../components/AmountSheet'
import { Button } from '../../components/Button'
import { EntityIcon } from '../../components/EntityIcon'
import { db } from '../../db/db'
import { messageOf } from '../../db/errors'
import type { BudgetTemplate } from '../../db/budgets'
import { completeOnboarding } from '../../db/onboarding'
import type { WalletInput } from '../../db/wallets'
import { DEFAULT_WALLET_PRESETS } from '../../domain/defaults'
import { NAME_MAX_LENGTH, normalizeName, validateName } from '../../domain/names'
import { currentMonth, formatMonth } from '../../lib/date'
import { formatRupiah, sumRupiah } from '../../lib/money'

interface DraftWallet extends WalletInput {
  key: string
  selected: boolean
}

const QUICK_AMOUNTS = [50_000, 100_000, 500_000] as const

const TEMPLATE_OPTIONS: readonly { value: BudgetTemplate; label: string; hint: string }[] = [
  { value: '50-30-20', label: 'Template 50/30/20', hint: 'Kebutuhan 50%, Keinginan 30%, Tabungan 20%' },
  { value: 'kosong', label: 'Mulai kosong', hint: 'Buat pos sendiri nanti di Anggaran' },
]

const STEP_TEXT = {
  1: { title: 'Uangmu ada di mana saja?', body: 'Pilih dompet yang kamu pakai. Nama, ikon, dan warnanya bisa diubah nanti.' },
  2: { title: 'Berapa isi tiap dompet sekarang?', body: 'Isi saldo awal sesuai yang ada saat ini. Biarkan Rp0 kalau dompetnya kosong.' },
  3: { title: 'Mau langsung bagi dana bulan ini?', body: 'Opsional. Isi total dana yang mau dibagi; semuanya bisa diubah nanti di Anggaran.' },
} as const

function initialDrafts(): DraftWallet[] {
  return DEFAULT_WALLET_PRESETS.map((preset) => ({ ...preset, key: preset.name, selected: true, startBalance: 0 }))
}

export function OnboardingPage() {
  const walletCount = useLiveQuery(() => db.wallets.count())
  if (walletCount === undefined) return null
  if (walletCount > 0) return <Navigate to="/" replace />
  return <Onboarding />
}

function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [drafts, setDrafts] = useState<DraftWallet[]>(initialDrafts)
  const [customName, setCustomName] = useState('')
  const [customError, setCustomError] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [totalFund, setTotalFund] = useState(0)
  const [template, setTemplate] = useState<BudgetTemplate>('50-30-20')
  const [editingFund, setEditingFund] = useState(false)
  const month = currentMonth()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const selected = drafts.filter((d) => d.selected)
  const editing = drafts.find((d) => d.key === editingKey)

  function toggle(key: string) {
    setDrafts((list) => list.map((d) => (d.key === key ? { ...d, selected: !d.selected } : d)))
  }

  function addCustom() {
    const problem = validateName(customName, drafts.map((d) => d.name), 'dompet')
    if (problem) {
      setCustomError(problem)
      return
    }
    const name = normalizeName(customName)
    setDrafts((list) => [...list, { key: `lain-${name}`, name, icon: 'wallet', color: 'indigo', startBalance: 0, selected: true }])
    setCustomName('')
    setCustomError(null)
  }

  function removeCustom(key: string) {
    setDrafts((list) => list.filter((d) => d.key !== key))
  }

  function setBalance(key: string, startBalance: number) {
    setDrafts((list) => list.map((d) => (d.key === key ? { ...d, startBalance } : d)))
  }

  async function finish(withBudget: boolean) {
    setBusy(true)
    setError(null)
    try {
      await completeOnboarding(
        selected.map(({ name, icon, color, startBalance }) => ({ name, icon, color, startBalance })),
        withBudget ? { month, totalFund, template } : undefined,
      )
      navigate('/', { replace: true })
    } catch (e) {
      setError(messageOf(e))
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-accent">Langkah {step} dari 3</p>
        <h1 className="text-3xl font-semibold tracking-tight">{STEP_TEXT[step].title}</h1>
        <p className="text-muted">{STEP_TEXT[step].body}</p>
      </header>

      {step === 1 ? (
        <section className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2">
            {drafts.map((d) => {
              const isPreset = DEFAULT_WALLET_PRESETS.some((p) => p.name === d.key)
              return (
                <li key={d.key} className="flex items-center gap-1">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={d.selected}
                    onClick={() => toggle(d.key)}
                    className="flex min-h-16 flex-1 items-center gap-3 rounded-card border border-line bg-surface px-3 text-left aria-checked:border-accent aria-checked:bg-accent-soft"
                  >
                    <EntityIcon icon={d.icon} color={d.color} />
                    <span className="flex-1 font-medium">{d.name}</span>
                    <span
                      aria-hidden="true"
                      className={`flex size-6 items-center justify-center rounded-full border-2 ${d.selected ? 'border-accent bg-accent text-accent-ink' : 'border-line'}`}
                    >
                      {d.selected && <Check className="size-4" strokeWidth={3} />}
                    </span>
                  </button>
                  {!isPreset && (
                    <button
                      type="button"
                      onClick={() => removeCustom(d.key)}
                      aria-label={`Hapus ${d.name} dari daftar`}
                      className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
                    >
                      <X aria-hidden="true" className="size-5" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>

          <form
            className="flex flex-col gap-1.5"
            onSubmit={(e) => {
              e.preventDefault()
              addCustom()
            }}
          >
            <label htmlFor="dompet-lain" className="text-sm font-medium text-muted">
              Dompet lain
            </label>
            <div className="flex gap-2">
              <input
                id="dompet-lain"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Misalnya GoPay atau Jago"
                maxLength={NAME_MAX_LENGTH + 10}
                autoComplete="off"
                aria-invalid={customError ? true : undefined}
                aria-describedby={customError ? 'dompet-lain-galat' : undefined}
                className="min-h-12 min-w-0 flex-1 rounded-control border border-line bg-surface px-4 text-base aria-invalid:border-expense"
              />
              <Button type="submit" variant="secondary" aria-label="Tambahkan dompet lain" className="px-4">
                <Plus aria-hidden="true" className="size-5" />
              </Button>
            </div>
            {customError && (
              <p id="dompet-lain-galat" className="text-sm text-expense">
                {customError}
              </p>
            )}
          </form>

          <div className="mt-auto flex flex-col gap-2 pt-2">
            {selected.length === 0 && <p className="text-sm text-muted">Pilih minimal satu dompet untuk lanjut.</p>}
            <Button block disabled={selected.length === 0} onClick={() => setStep(2)}>
              Lanjut
            </Button>
          </div>
        </section>
      ) : step === 2 ? (
        <section className="flex flex-1 flex-col gap-4">
          <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface">
            {selected.map((d) => (
              <li key={d.key}>
                <button
                  type="button"
                  onClick={() => setEditingKey(d.key)}
                  aria-label={`Saldo awal ${d.name}: ${formatRupiah(d.startBalance)}. Ketuk untuk mengubah.`}
                  className="flex min-h-16 w-full items-center gap-3 px-3 text-left hover:bg-surface-2"
                >
                  <EntityIcon icon={d.icon} color={d.color} />
                  <span className="flex-1 font-medium">{d.name}</span>
                  <span className="font-semibold tabular-nums">{formatRupiah(d.startBalance)}</span>
                  <ChevronRight aria-hidden="true" className="size-5 text-muted" />
                </button>
              </li>
            ))}
          </ul>
          <p className="flex justify-between px-1 text-muted">
            <span>Total</span>
            <span className="font-semibold text-ink tabular-nums">
              {formatRupiah(sumRupiah(selected.map((d) => d.startBalance)))}
            </span>
          </p>

          <div className="mt-auto flex flex-col gap-2 pt-2">
            <Button block onClick={() => setStep(3)}>
              Lanjut
            </Button>
            <Button variant="secondary" block onClick={() => setStep(1)}>
              Kembali
            </Button>
          </div>
        </section>
      ) : (
        <section className="flex flex-1 flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-muted">Total dana {formatMonth(month)}</span>
            <button
              type="button"
              onClick={() => setEditingFund(true)}
              aria-label={`Total dana ${formatMonth(month)}: ${formatRupiah(totalFund)}. Ketuk untuk mengubah.`}
              className="flex min-h-16 items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 text-left hover:bg-surface-2"
            >
              <span className="text-xl font-semibold tabular-nums">{formatRupiah(totalFund)}</span>
              <ChevronRight aria-hidden="true" className="size-5 text-muted" />
            </button>
          </div>

          <div role="radiogroup" aria-label="Cara membagi dana" className="flex flex-col gap-2">
            {TEMPLATE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={template === option.value}
                onClick={() => setTemplate(option.value)}
                className="flex min-h-16 items-center gap-3 rounded-card border border-line bg-surface px-4 text-left aria-checked:border-accent aria-checked:bg-accent-soft"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{option.label}</span>
                  <span className="block text-sm text-muted">{option.hint}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={`flex size-6 items-center justify-center rounded-full border-2 ${template === option.value ? 'border-accent bg-accent text-accent-ink' : 'border-line'}`}
                >
                  {template === option.value && <Check className="size-4" strokeWidth={3} />}
                </span>
              </button>
            ))}
          </div>

          {error && (
            <p role="alert" className="text-sm text-expense">
              {error}
            </p>
          )}

          <div className="mt-auto flex flex-col gap-2 pt-2">
            <Button block disabled={busy || totalFund === 0} onClick={() => void finish(true)}>
              Simpan dan mulai
            </Button>
            <Button variant="secondary" block disabled={busy} onClick={() => void finish(false)}>
              Lewati, mulai mencatat
            </Button>
            <Button variant="ghost" block onClick={() => setStep(2)}>
              Kembali
            </Button>
          </div>
        </section>
      )}

      <AmountSheet
        open={editingFund}
        title={`Total dana ${formatMonth(month)}`}
        initialValue={totalFund}
        quickAmounts={[100_000, 500_000, 1_000_000]}
        onClose={() => setEditingFund(false)}
        onSave={setTotalFund}
      />

      <AmountSheet
        open={editing !== undefined}
        title={editing ? `Saldo awal ${editing.name}` : 'Saldo awal'}
        initialValue={editing?.startBalance ?? 0}
        quickAmounts={QUICK_AMOUNTS}
        onClose={() => setEditingKey(null)}
        onSave={(value) => {
          if (editingKey) setBalance(editingKey, value)
        }}
      />
    </main>
  )
}
