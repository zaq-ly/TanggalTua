import { Check } from 'lucide-react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { COLOR_KEYS, COLOR_LABELS, colorVar, type ColorKey } from '../lib/palette'

interface ColorPickerProps {
  value: string
  onChange: (color: ColorKey) => void
  label?: string
}

export function ColorPicker({ value, onChange, label = 'Warna' }: ColorPickerProps) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (step === 0) return
    event.preventDefault()
    const index = Math.max(0, COLOR_KEYS.indexOf(value as ColorKey))
    const next = COLOR_KEYS[(index + step + COLOR_KEYS.length) % COLOR_KEYS.length]
    if (next) {
      onChange(next)
      event.currentTarget.querySelector<HTMLButtonElement>(`[data-color="${next}"]`)?.focus()
    }
  }

  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className="flex flex-wrap gap-1">
      {COLOR_KEYS.map((key) => {
        const selected = key === value
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={COLOR_LABELS[key]}
            data-color={key}
            tabIndex={selected || (!COLOR_KEYS.includes(value as ColorKey) && key === COLOR_KEYS[0]) ? 0 : -1}
            onClick={() => onChange(key)}
            style={{ '--swatch': colorVar(key) } as CSSProperties}
            className="flex size-11 items-center justify-center rounded-full"
          >
            <span
              className={`flex size-8 items-center justify-center rounded-full bg-(--swatch) text-canvas ${selected ? 'ring-2 ring-(--swatch) ring-offset-2 ring-offset-surface' : ''}`}
            >
              {selected && <Check aria-hidden="true" className="size-4" strokeWidth={3} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}
