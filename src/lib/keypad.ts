import type { Rupiah } from '../db/types'
import { MAX_RUPIAH } from './money'

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '000'

/**
 * Menambah digit di kanan. Penekanan yang membuat nilai melewati `max`
 * diabaikan, supaya angka yang sudah diketik tidak berubah diam-diam.
 */
export function pressKey(value: Rupiah, key: KeypadKey, max: Rupiah = MAX_RUPIAH): Rupiah {
  const next = Number(`${value}${key}`)
  return next <= max ? next : value
}

export function backspace(value: Rupiah): Rupiah {
  return Math.floor(value / 10)
}

/** Pintasan seperti +10rb. Dibatasi `max`. */
export function addQuick(value: Rupiah, amount: Rupiah, max: Rupiah = MAX_RUPIAH): Rupiah {
  return Math.min(value + amount, max)
}
