import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'

/**
 * Kembali ke halaman sebelumnya di riwayat aplikasi, supaya tombol kembali membawa pengguna ke
 * tempat asalnya (misalnya Kelola dompet dari Beranda kembali ke Beranda, bukan ke Pengaturan).
 * Bila halaman dibuka langsung tanpa riwayat, pindah ke `fallback` (halaman induknya).
 */
export function useGoBack(fallback: string): () => void {
  const navigate = useNavigate()
  const { key } = useLocation()
  // React Router memberi key 'default' pada entri pertama; selain itu ada halaman aplikasi sebelumnya.
  const hasHistory = key !== 'default'
  return useCallback(() => {
    if (hasHistory) void navigate(-1)
    else void navigate(fallback, { replace: true })
  }, [hasHistory, navigate, fallback])
}
