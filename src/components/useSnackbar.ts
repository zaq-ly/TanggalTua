import { create } from 'zustand'

export const SNACKBAR_DURATION_MS = 5_000

interface SnackbarAction {
  label: string
  run: () => Promise<void> | void
}

interface SnackbarState {
  /** Berubah setiap pesan baru, supaya pesan yang sama berturut-turut tetap memulai ulang timer. */
  id: number
  message: string | null
  action: SnackbarAction | null
  show: (message: string, action?: SnackbarAction) => void
  hide: () => void
}

export const useSnackbar = create<SnackbarState>()((set) => ({
  id: 0,
  message: null,
  action: null,
  show: (message, action) => set((s) => ({ id: s.id + 1, message, action: action ?? null })),
  hide: () => set({ message: null, action: null }),
}))
