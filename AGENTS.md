# AGENTS.md

Panduan untuk agen coding (Claude Code dan sejenisnya) yang mengerjakan proyek ini. Baca juga `PRD.md` sebelum mulai. PRD adalah sumber kebenaran untuk fitur, model data, dan kriteria penerimaan.

## Proyek

**Keuangan Zaq**: PWA mobile-first untuk mencatat pemasukan, pengeluaran, transfer antar dompet, dan membagi dana ke pos anggaran custom. Dipakai pribadi, offline-first, tanpa backend, tanpa akun. Bahasa antarmuka Indonesia, mata uang Rupiah.

## Tech stack

Vite, React, TypeScript (strict), Tailwind CSS, Dexie (IndexedDB), Zustand, React Router, Recharts, lucide-react, vite-plugin-pwa, Vitest + Testing Library. Deploy ke Cloudflare Pages.

Jangan menambah dependensi di luar daftar ini tanpa bertanya dulu ke pemilik proyek. Jelaskan alasan dan alternatifnya.

## Perintah

```bash
npm install          # pasang dependensi
npm run dev          # server dev
npm run build        # build produksi (tsc + vite)
npm run preview      # cek hasil build + PWA
npm run test         # vitest
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
```

Sebelum menyatakan sebuah tugas selesai, jalankan `typecheck`, `lint`, `test`, dan `build`. Semuanya harus lolos.

## Struktur folder

```
src/
  db/            skema Dexie, migrasi, query dan helper akses data
  domain/        logika murni (saldo, anggaran, statistik, ekspor), tanpa React
  lib/           util umum: uang, tanggal, id, csv
  components/    komponen UI bersama (Button, Sheet, IconPicker, Keypad, ...)
  features/      satu folder per fitur: wallets, categories, transactions,
                 home, budget, stats, backup, settings
  routes/        definisi halaman dan router
  styles/        css global dan token tema
public/          ikon PWA, manifest aset
```

Aturan penempatan: logika perhitungan masuk `domain/` dan harus fungsi murni yang bisa dites tanpa DOM. Komponen React hanya menampilkan dan memanggil fungsi tersebut.

## Aturan yang tidak boleh dilanggar

1. **Uang adalah integer rupiah.** Tidak ada `float`, tidak ada `toFixed` untuk uang. Semua format dan parsing lewat `lib/money.ts`. Saat menjumlah, hasilnya tetap integer.
2. **Saldo tidak disimpan, selalu dihitung** dari saldo awal dan transaksi (lihat PRD bagian 5). Jangan membuat kolom saldo yang bisa tidak sinkron.
3. **Transfer bukan pemasukan dan bukan pengeluaran.** Jangan masuk ke total pemasukan atau pengeluaran.
4. **Tanggal transaksi adalah string `YYYY-MM-DD` waktu lokal.** Jangan simpan sebagai timestamp UTC untuk tanggal transaksi, supaya tidak bergeser zona waktu. Pakai helper di `lib/date.ts`.
5. **Dompet dan kategori yang sudah dipakai tidak dihapus permanen**, hanya diarsipkan.
6. **Tidak ada permintaan jaringan saat aplikasi dipakai.** Tidak ada analitik, font eksternal runtime, atau CDN. Font dan aset di-bundle.
7. **Tidak ada `localStorage` untuk data keuangan.** Semua data di IndexedDB lewat Dexie. `localStorage` hanya boleh untuk preferensi UI kecil (misalnya tema).
8. **Setiap perubahan skema Dexie wajib menaikkan versi dan menulis migrasi**, dan mengubah `schemaVersion` pada ekspor. Jangan mengubah skema lama secara diam-diam.
9. **Ekspor dan impor harus bolak-balik identik.** Ekspor lalu impor ke database kosong menghasilkan data yang sama persis.
10. **Aksi destruktif** (hapus transaksi, hapus semua data, impor yang mengganti data) butuh konfirmasi atau undo.

## Konvensi kode

- TypeScript strict, tanpa `any`. Gunakan tipe dari `src/db/types.ts` untuk entitas.
- Komponen fungsi dan hooks. Satu komponen per file, nama file `PascalCase.tsx`. Util `camelCase.ts`.
- Tailwind untuk styling. Warna dan radius lewat token tema (CSS variables), bukan hex yang tersebar di komponen. Dukung tema terang dan gelap sejak awal.
- Data reaktif dengan `useLiveQuery`. Hindari menyalin data database ke state lokal.
- Fungsi kecil, nama jelas, komentar hanya untuk "kenapa", bukan "apa".
- Teks antarmuka dalam bahasa Indonesia, kalimat biasa (sentence case), kata kerja aktif ("Simpan transaksi", bukan "Submit"). Pesan error menyebut apa yang salah dan cara memperbaikinya.
- Format tampilan: `Rp1.234.567`, tanggal `25 Nov 2026`. Ringkas untuk label grafik: `Rp1,2 jt`.

## Desain dan UX

- Mobile-first: rancang dari lebar 360 px. Area sentuh minimal 44 px. Hormati safe-area (`env(safe-area-inset-*)`).
- Input jumlah memakai keypad angka sendiri dengan pemisah ribuan otomatis.
- Aksi utama (tambah transaksi) harus bisa dicapai dari Beranda dalam satu ketukan.
- Beri kondisi kosong yang mengarahkan ke aksi berikutnya, bukan layar kosong.
- Hormati `prefers-reduced-motion`. Fokus keyboard harus terlihat. Tombol ikon wajib punya `aria-label`.
- Hindari tampilan template generik: pilih satu aksen warna yang konsisten dan satu keluarga font, jangan menumpuk efek dekoratif.

## Pengujian

- Logika di `domain/` dan `lib/` wajib punya tes unit. Kasus minimal untuk saldo: transaksi diedit, dihapus, transfer, dan dompet diarsipkan.
- Tes anggaran: pos berlebih, belum dialokasikan, konversi persen ke nominal dan sebaliknya, pembulatan.
- Tes ekspor/impor: bolak-balik identik dan penolakan versi skema yang tidak cocok.
- Komponen kritis (Keypad, form transaksi) dites dengan Testing Library.
- Perbaikan bug harus disertai tes yang gagal sebelum perbaikan.

## Alur kerja

1. Baca `PRD.md`, terutama bagian tahap pengerjaan (bagian 9) dan kriteria penerimaan (bagian 10).
2. Kerjakan **satu tahap sekali**, berurutan. Jangan melompat ke tahap berikutnya sebelum kriteria tahap saat ini terpenuhi.
3. Sebelum menulis kode untuk tahap baru, tulis rencana singkat (file yang akan dibuat atau diubah) dan tunggu persetujuan bila ada keputusan desain yang belum diputuskan di PRD.
4. Commit kecil dan sering, pesan commit gaya Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`).
5. Di akhir tiap tahap, ringkas apa yang selesai, apa yang belum, dan apa yang perlu dicek manual di HP.
6. Jika PRD ambigu atau bertentangan dengan aturan di file ini, tanya dulu. Jangan menebak untuk hal yang menyangkut data keuangan.

## Cakupan

- Patuhi prioritas P0, P1, P2 di PRD. Fitur P2 dan di luar PRD (login, sinkron cloud, integrasi bank, multi mata uang) tidak dikerjakan kecuali diminta.
- Jangan refactor besar di luar tahap yang sedang dikerjakan.
- Jangan menyentuh atau menghapus data pengguna di database saat pengembangan tanpa konfirmasi. Gunakan data contoh (seed) untuk uji, terpisah dari data nyata.

## Definisi selesai

Sebuah tugas selesai bila:
- Memenuhi kriteria penerimaan terkait di PRD.
- `typecheck`, `lint`, `test`, dan `build` lolos.
- Tidak ada `console.log` atau kode debug tertinggal.
- Tampilan sudah diperiksa pada lebar 360 px, tema terang dan gelap.
- Perubahan skema (jika ada) punya migrasi dan tes.
