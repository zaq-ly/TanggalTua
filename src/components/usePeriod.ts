import { create } from 'zustand'
import { monthPeriod, type Period } from '../domain/period'
import { currentMonth } from '../lib/date'

interface PeriodState {
  /** Dipakai bersama Beranda, Riwayat, Statistik, dan Anggaran (PRD F5). Bawaan: bulan ini. */
  period: Period
  setPeriod: (period: Period) => void
}

export const usePeriod = create<PeriodState>()((set) => ({
  period: monthPeriod(currentMonth()),
  setPeriod: (period) => set({ period }),
}))
