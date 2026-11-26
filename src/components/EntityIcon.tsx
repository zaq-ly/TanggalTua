import { createElement, type CSSProperties } from 'react'
import { colorVar } from '../lib/palette'
import { getIcon } from './iconRegistry'

interface EntityIconProps {
  icon: string
  color: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const SIZES = {
  xs: { box: 'size-6', glyph: 'size-3.5' },
  sm: { box: 'size-9', glyph: 'size-4.5' },
  md: { box: 'size-10', glyph: 'size-5' },
  lg: { box: 'size-14', glyph: 'size-7' },
} as const

export function EntityIcon({ icon, color, size = 'md' }: EntityIconProps) {
  const style = { '--entity': colorVar(color) } as CSSProperties
  return (
    <span
      aria-hidden="true"
      style={style}
      className={`${SIZES[size].box} flex shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--entity)_16%,transparent)] text-(--entity)`}
    >
      {/* createElement karena ikon dipilih dari registri statis, bukan komponen yang dibuat saat render. */}
      {createElement(getIcon(icon), { className: SIZES[size].glyph, strokeWidth: 1.9 })}
    </span>
  )
}
