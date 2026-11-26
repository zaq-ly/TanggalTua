export type PersistStatus = 'persisted' | 'not-persisted' | 'unsupported'

function storageManager(): StorageManager | null {
  return typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function'
    ? navigator.storage
    : null
}

export async function persistStatus(): Promise<PersistStatus> {
  const storage = storageManager()
  if (!storage) return 'unsupported'
  return (await storage.persisted()) ? 'persisted' : 'not-persisted'
}

/**
 * Meminta browser tidak menghapus IndexedDB saat ruang HP menipis (PRD F10). Chrome biasanya
 * mengabulkan tanpa dialog bila aplikasi sudah dipasang ke layar utama.
 */
export async function requestPersistentStorage(): Promise<PersistStatus> {
  const storage = storageManager()
  if (!storage) return 'unsupported'
  if (await storage.persisted()) return 'persisted'
  return (await storage.persist()) ? 'persisted' : 'not-persisted'
}
