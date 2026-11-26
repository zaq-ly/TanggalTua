import { create } from 'zustand'

interface TransactionSheetState {
  isOpen: boolean
  /** `null` untuk transaksi baru. */
  editingId: string | null
  open: () => void
  openEdit: (id: string) => void
  close: () => void
}

export const useAddSheet = create<TransactionSheetState>()((set) => ({
  isOpen: false,
  editingId: null,
  open: () => set({ isOpen: true, editingId: null }),
  openEdit: (id) => set({ isOpen: true, editingId: id }),
  close: () => set({ isOpen: false, editingId: null }),
}))
