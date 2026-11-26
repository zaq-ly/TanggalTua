import { useId } from 'react'

interface SwitchRowProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function SwitchRow({ label, description, checked, onChange }: SwitchRowProps) {
  const id = useId()
  return (
    <div className="flex items-center gap-3 rounded-card bg-surface px-4 py-3">
      <div className="min-w-0 flex-1">
        <p id={`${id}-label`} className="font-medium">
          {label}
        </p>
        {description && (
          <p id={`${id}-desc`} className="text-sm text-muted">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        onClick={() => onChange(!checked)}
        className="flex min-h-11 min-w-14 shrink-0 items-center justify-center"
      >
        <span
          aria-hidden="true"
          className={`relative h-7 w-12 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-line'}`}
        >
          <span
            className={`absolute top-1 size-5 rounded-full bg-surface shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </span>
      </button>
    </div>
  )
}
