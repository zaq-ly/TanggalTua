/**
 * Warna entitas disimpan sebagai kunci palet, bukan hex, supaya setiap kunci
 * bisa punya nada berbeda untuk tema terang dan gelap (lihat styles/index.css).
 */
export const COLOR_KEYS = [
  'indigo',
  'violet',
  'pink',
  'rose',
  'red',
  'orange',
  'amber',
  'lime',
  'green',
  'teal',
  'sky',
  'blue',
  'slate',
] as const

export type ColorKey = (typeof COLOR_KEYS)[number]

export const COLOR_LABELS: Record<ColorKey, string> = {
  indigo: 'Nila',
  violet: 'Ungu',
  pink: 'Merah muda',
  rose: 'Mawar',
  red: 'Merah',
  orange: 'Oranye',
  amber: 'Kuning tua',
  lime: 'Hijau limau',
  green: 'Hijau',
  teal: 'Hijau toska',
  sky: 'Biru langit',
  blue: 'Biru',
  slate: 'Abu-abu',
}

export const FALLBACK_COLOR: ColorKey = 'slate'

export function isColorKey(value: unknown): value is ColorKey {
  return typeof value === 'string' && (COLOR_KEYS as readonly string[]).includes(value)
}

/** Nilai CSS untuk dipakai di `style`, misalnya `var(--swatch-blue)`. */
export function colorVar(key: string): string {
  return `var(--swatch-${isColorKey(key) ? key : FALLBACK_COLOR})`
}
