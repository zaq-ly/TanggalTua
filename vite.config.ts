/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Versi baru menunggu persetujuan pengguna, supaya form yang sedang diisi tidak hilang karena muat ulang.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Keuangan Zaq',
        short_name: 'Keuangan',
        description: 'Pencatat keuangan pribadi: pemasukan, pengeluaran, transfer, dan anggaran. Offline, tanpa akun.',
        lang: 'id',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f5f6fb',
        theme_color: '#f5f6fb',
        categories: ['finance', 'productivity'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Semua aset, termasuk halaman Statistik yang dimuat lazy dan font, disimpan saat pemasangan
        // supaya seluruh fitur berjalan dalam mode pesawat (PRD F10).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        // Pustaka yang jarang berubah dipisah dari kode aplikasi, supaya pembaruan aplikasi
        // hanya mengunduh ulang potongan kecil. Recharts tetap di potongan Statistik yang lazy.
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/ },
            { name: 'vendor-data', test: /node_modules[\\/](dexie|dexie-react-hooks|zustand|nanoid)[\\/]/ },
            { name: 'vendor-icons', test: /node_modules[\\/]lucide-react[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    alias: { 'virtual:pwa-register/react': fileURLToPath(new URL('./src/test/pwaRegisterStub.ts', import.meta.url)) },
  },
})
