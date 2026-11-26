import { describe, expect, it } from 'vitest'
import { UTF8_BOM, csvField, csvRow, toCsv } from './csv'

describe('csv', () => {
  it('nilai biasa tidak dikutip', () => {
    expect(csvRow(['2026-11-25', 'Pengeluaran', 25000, 'Makanan'])).toBe('2026-11-25,Pengeluaran,25000,Makanan')
  })

  it('koma, kutip, dan baris baru dikutip dengan benar', () => {
    expect(csvField('Kopi, roti')).toBe('"Kopi, roti"')
    expect(csvField('Kata "enak"')).toBe('"Kata ""enak"""')
    expect(csvField('baris\nbaru')).toBe('"baris\nbaru"')
  })

  it('catatan yang mirip rumus tidak dijalankan', () => {
    expect(csvField('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(csvField('-50rb kembalian')).toBe("'-50rb kembalian")
    expect(csvField('@teman')).toBe("'@teman")
    expect(csvField(-5)).toBe('-5')
  })

  it('file diawali BOM dan memakai CRLF', () => {
    expect(toCsv(['A', 'B'], [[1, 'x']])).toBe(`${UTF8_BOM}A,B\r\n1,x\r\n`)
  })
})
