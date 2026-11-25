import { createElement, type CSSProperties } from 'react'
import { colorVar } from '../lib/palette'
import { getIcon } from './iconRegistry'

interface EntityIconProps {
  icon: string
  color: string
  size?: 'md' | 'lg'
}

const SIZES = {
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
