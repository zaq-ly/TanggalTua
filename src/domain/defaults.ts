import type { Category, CategoryKind } from '../db/types'
import type { ColorKey } from '../lib/palette'

interface Preset {
  name: string
  icon: string
  color: ColorKey
}

export const DEFAULT_WALLET_PRESETS: readonly Preset[] = [
  { name: 'MyBCA', icon: 'landmark', color: 'blue' },
  { name: 'BRImo', icon: 'smartphone', color: 'sky' },
  { name: 'Tunai', icon: 'wallet', color: 'green' },
]

const EXPENSE_PRESETS: readonly Preset[] = [
  { name: 'Makanan', icon: 'utensils', color: 'orange' },
  { name: 'Minuman/Kopi', icon: 'coffee', color: 'amber' },
  { name: 'Transport/Bensin', icon: 'fuel', color: 'blue' },
  { name: 'Pulsa/Kuota', icon: 'wifi', color: 'sky' },
  { name: 'Tagihan Rumah', icon: 'house', color: 'teal' },
  { name: 'Skincare', icon: 'sparkles', color: 'pink' },
  { name: 'Outfit', icon: 'shirt', color: 'violet' },
  { name: 'Hobi/Sepeda', icon: 'bike', color: 'green' },
  { name: 'Hiburan', icon: 'gamepad', color: 'rose' },
  { name: 'Tabungan', icon: 'piggy-bank', color: 'indigo' },
  { name: 'Lainnya', icon: 'ellipsis', color: 'slate' },
]

const INCOME_PRESETS: readonly Preset[] = [
  { name: 'Gaji', icon: 'banknote', color: 'green' },
  { name: 'Bonus', icon: 'award', color: 'amber' },
  { name: 'Freelance', icon: 'laptop', color: 'blue' },
  { name: 'Hadiah', icon: 'gift', color: 'pink' },
  { name: 'Lainnya', icon: 'ellipsis', color: 'slate' },
]

function toCategories(kind: CategoryKind, presets: readonly Preset[], makeId: () => string): Category[] {
  return presets.map((preset, index) => ({
    id: makeId(),
    kind,
    name: preset.name,
    icon: preset.icon,
    color: preset.color,
    archived: false,
    sort: index,
  }))
}

export function buildDefaultCategories(makeId: () => string): Category[] {
  return [...toCategories('expense', EXPENSE_PRESETS, makeId), ...toCategories('income', INCOME_PRESETS, makeId)]
}
