import type { Slice } from '../../domain/stats'
import { colorVar } from '../../lib/palette'

/** Warna potongan: warna kategori, atau abu netral untuk gabungan "Kategori lain". */
export function sliceColor(slice: Pick<Slice, 'color'>): string {
  return slice.color === null ? 'var(--chart-other)' : colorVar(slice.color)
}
