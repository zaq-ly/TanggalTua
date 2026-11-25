export const NAME_MAX_LENGTH = 30

/** Rapikan spasi supaya "  Kopi   Pagi " dan "Kopi Pagi" dianggap sama. */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

/**
 * Mengembalikan pesan galat, atau `null` bila nama boleh dipakai.
 * `existingNames` berisi nama lain yang tidak boleh kembar (tanpa nama milik item yang sedang diedit).
 */
export function validateName(name: string, existingNames: readonly string[], noun: string): string | null {
  const normalized = normalizeName(name)
  if (normalized === '') return `Nama ${noun} wajib diisi.`
  if (normalized.length > NAME_MAX_LENGTH) {
    return `Nama ${noun} terlalu panjang. Maksimal ${NAME_MAX_LENGTH} karakter.`
  }
  const key = normalized.toLocaleLowerCase('id')
  if (existingNames.some((other) => normalizeName(other).toLocaleLowerCase('id') === key)) {
    return `Sudah ada ${noun} bernama "${normalized}". Pakai nama lain.`
  }
  return null
}
