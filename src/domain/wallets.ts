import { MAX_RUPIAH, formatRupiah, isRupiah } from '../lib/money'

/** Saldo awal wajib bilangan bulat 0 sampai MAX_RUPIAH (diputuskan pemilik: tidak boleh negatif). */
export function validateStartBalance(value: number): string | null {
  if (!isRupiah(value)) return 'Saldo awal harus angka rupiah tanpa desimal.'
  if (value < 0) return 'Saldo awal tidak boleh negatif. Isi 0 bila dompet sedang kosong.'
  if (value > MAX_RUPIAH) return `Saldo awal maksimal ${formatRupiah(MAX_RUPIAH)}.`
  return null
}
