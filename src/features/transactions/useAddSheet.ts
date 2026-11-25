import { create } from 'zustand'

interface AddSheetState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useAddSheet = create<AddSheetState>()((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
