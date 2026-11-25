/** Galat yang pesannya aman dan berguna untuk ditampilkan langsung ke pengguna. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UserFacingError'
  }
}

export function messageOf(error: unknown): string {
  if (error instanceof UserFacingError) return error.message
  return 'Terjadi kesalahan saat menyimpan. Coba lagi; bila terus terjadi, muat ulang aplikasi.'
}
