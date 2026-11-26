import type { useRegisterSW as UseRegisterSW } from 'virtual:pwa-register/react'

/** Pengganti `virtual:pwa-register/react` di tes; service worker tidak ada di jsdom. */
export const useRegisterSW: typeof UseRegisterSW = () => ({
  needRefresh: [false, () => {}],
  offlineReady: [false, () => {}],
  updateServiceWorker: async () => {},
})
