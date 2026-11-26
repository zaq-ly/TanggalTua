/** CSV standar (RFC 4180), pemisah koma; keputusan pemilik: dibuka di Google Sheets. */
export const CSV_SEPARATOR = ','

/** Penanda UTF-8 supaya huruf di catatan terbaca benar juga bila dibuka di Excel. */
export const UTF8_BOM = '﻿'

/**
 * Membungkus nilai dengan kutip bila perlu. Nilai yang diawali =, +, -, @ diberi apostrof
 * supaya catatan tidak dijalankan sebagai rumus oleh aplikasi spreadsheet.
 */
export function csvField(value: string | number): string {
  let text = String(value)
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function csvRow(values: readonly (string | number)[]): string {
  return values.map(csvField).join(CSV_SEPARATOR)
}

export function toCsv(header: readonly string[], rows: readonly (readonly (string | number)[])[]): string {
  return UTF8_BOM + [csvRow(header), ...rows.map(csvRow)].join('\r\n') + '\r\n'
}
