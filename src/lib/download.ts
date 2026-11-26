/** Mengunduh teks sebagai file. Tidak ada jaringan: berkas dibuat dan disimpan di perangkat. */
export function downloadTextFile(filename: string, text: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  // Ditunda sedikit supaya browser sempat mulai menyimpan sebelum URL dicabut.
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

function asFile(filename: string, text: string, mime: string): File {
  return new File([text], filename, { type: mime })
}

/** Lembar bagikan bawaan HP (misalnya ke Google Drive atau WhatsApp), bila didukung. */
export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({ files: [asFile('cek.json', '{}', 'application/json')] })
  } catch {
    return false
  }
}

/** `false` bila pengguna membatalkan lembar bagikan. */
export async function shareTextFile(filename: string, text: string, mime: string, title: string): Promise<boolean> {
  try {
    await navigator.share({ files: [asFile(filename, text, mime)], title })
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return false
    throw error
  }
}
