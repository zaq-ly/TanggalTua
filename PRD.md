# PRD: Keuangan Zaq (PWA Pencatat Keuangan Pribadi)

Versi 1.0 · Status: siap dibangun · Pemilik: Zaq

## 1. Ringkasan

Aplikasi web mobile-first (PWA) untuk mencatat pemasukan, pengeluaran, dan transfer antar dompet, serta membagi uang ke pos anggaran yang bisa dinamai sendiri. Dipakai pribadi oleh satu orang, di HP, tanpa akun dan tanpa server. Semua data tersimpan di perangkat dan bisa dicadangkan lewat ekspor.

### Masalah yang diselesaikan
- Uang tersebar di beberapa dompet (MyBCA, BRImo, cash) dan sulit melihat total sebenarnya.
- Pembagian uang (kebutuhan, keinginan, tabungan) tidak terkontrol karena tidak ada batas yang terlihat.
- Pengeluaran kecil yang tidak rutin (kopi, sparepart, skincare, outfit) tidak tercatat, jadi tidak tahu uangnya ke mana.

### Tujuan
1. Mencatat transaksi dalam kurang dari 10 detik per transaksi.
2. Melihat total saldo semua dompet dan saldo per dompet kapan saja.
3. Membagi dana bulanan ke pos anggaran bebas dan melihat sisanya.
4. Melihat ringkasan dan grafik per kategori, per bulan.
5. Data aman: bisa diekspor dan dipulihkan.

### Bukan tujuan (v1)
- Login, akun, atau sinkron antar perangkat.
- Terhubung otomatis ke bank atau e-wallet.
- Multi mata uang, investasi, utang/piutang, tagihan berulang otomatis.
- Multi pengguna.

## 2. Pengguna

Satu pengguna: Zaq, developer frontend, memakai Android dan memasang aplikasi lewat "Add to Home Screen". Bahasa antarmuka: Indonesia. Mata uang: Rupiah (IDR).

## 3. Fitur

Prioritas: **P0** wajib v1, **P1** v1 jika waktu cukup, **P2** nanti.

### F1. Dompet (P0)
- Tambah, ubah nama, ubah ikon/warna, arsipkan dompet. Contoh awal: MyBCA, BRImo, Tunai.
- Setiap dompet punya **saldo awal** yang diisi pengguna saat pertama kali.
- Saldo dompet = saldo awal + pemasukan − pengeluaran ± transfer.
- Dompet yang sudah punya transaksi tidak boleh dihapus permanen, hanya diarsipkan.
- Tampilkan **total saldo semua dompet** (tidak termasuk dompet yang diarsipkan, bisa diatur).

### F2. Kategori custom dengan ikon (P0)
- Dua jenis kategori terpisah: **pengeluaran** dan **pemasukan**.
- Pengguna bisa tambah, ubah nama, ubah ikon dan warna, urutkan, dan arsipkan kategori.
- Ikon dipilih dari set ikon bawaan (lucide-react) lewat pemilih ikon. Tidak ada upload gambar.
- Kategori bawaan saat pertama dipakai (bisa diubah atau diarsipkan):
  - Pengeluaran: Makanan, Minuman/Kopi, Transport/Bensin, Pulsa/Kuota, Tagihan Rumah, Skincare, Outfit, Hobi/Sepeda, Hiburan, Tabungan, Lainnya.
  - Pemasukan: Gaji, Bonus, Freelance, Hadiah, Lainnya.

### F3. Transaksi (P0)
- Jenis: **pemasukan**, **pengeluaran**, **transfer**.
- Field: jumlah, jenis, kategori (kecuali transfer), dompet (transfer: dompet asal dan tujuan), tanggal (default hari ini, bisa dipilih manual), catatan opsional.
- Edit dan hapus transaksi. Hapus meminta konfirmasi dan bisa di-undo sesaat lewat snackbar.
- Transfer tidak dihitung sebagai pemasukan maupun pengeluaran. Biaya admin transfer (opsional) dicatat sebagai pengeluaran terpisah.
- Input jumlah memakai keypad angka dengan pemisah ribuan otomatis, dan pintasan cepat (+10rb, +50rb).
- Daftar riwayat dikelompokkan per tanggal, dengan pencarian catatan dan filter dompet/kategori.

### F4. Ringkasan saldo (P0)
Halaman utama menampilkan:
- Total saldo semua dompet.
- Saldo per dompet.
- Total pemasukan dan total pengeluaran pada periode terpilih.
- Selisih (pemasukan − pengeluaran).
- 5 transaksi terakhir.

### F5. Filter periode (P0)
- Pemilih periode: bulan ini (default), bulan sebelumnya, pilih bulan lain, rentang tanggal kustom.
- Berlaku untuk Beranda, Statistik, Riwayat, dan Anggaran (Anggaran per bulan).

### F6. Statistik per kategori (P0)
- Grafik donat untuk pengeluaran per kategori dan untuk pemasukan per kategori (tab).
- Daftar kategori berurutan dari terbesar: ikon, nama, total rupiah, persentase.
- Ketuk kategori untuk melihat transaksi di dalamnya.
- Grafik batang pemasukan vs pengeluaran per bulan (6 bulan terakhir) (P1).
- Total ditampilkan lengkap, dan versi ringkas ("Rp1,2 jt") untuk label grafik.

### F7. Anggaran / pembagian dana (P0)
- Per bulan, pengguna mengisi **total dana** yang akan dibagi (contoh: Rp2.000.000).
- Pengguna membuat **pos** sendiri dengan nama bebas (contoh: Kebutuhan, Keinginan, Tabungan, Dana Darurat, Sepeda). Tiap pos punya nama, nominal, ikon, warna.
- Pos bisa diisi dengan nominal atau persen. Keduanya saling konversi otomatis berdasarkan total dana.
- Indikator **belum dialokasikan** = total dana − jumlah semua pos. Peringatan jika total pos melebihi total dana.
- Tombol "salin dari bulan lalu" supaya tidak mengisi ulang.
- Tiap kategori pengeluaran bisa dikaitkan ke satu pos (opsional). Pengeluaran pada kategori itu otomatis mengurangi sisa pos.
- Tiap pos menampilkan: jatah, terpakai, sisa, dan bar progres. Warna berubah saat sisa di bawah 20% dan saat terlampaui.
- Pos yang tidak punya kategori terkait bisa diperbarui manual (misalnya tabungan yang ditandai "sudah disisihkan").
- Template cepat: 50/30/20 dan "mulai kosong".

### F8. Ekspor dan backup (P0)
- Ekspor **JSON penuh** (semua dompet, kategori, transaksi, anggaran, pengaturan).
- Impor JSON dengan pratinjau jumlah data dan pilihan: ganti semua atau tolak jika versi skema tidak cocok.
- Ekspor **CSV transaksi** untuk periode terpilih.
- Pengingat lembut di Pengaturan menampilkan tanggal backup terakhir.

### F9. Pengaturan (P1)
- Tema terang, gelap, ikuti sistem.
- Kunci aplikasi dengan PIN (P2).
- Hapus semua data (konfirmasi dua langkah).

### F10. PWA (P0)
- Bisa dipasang ke layar utama, berjalan penuh layar, ikon dan splash.
- Berfungsi **offline sepenuhnya** setelah pemuatan pertama.
- Meminta penyimpanan persisten (`navigator.storage.persist()`) agar data tidak terhapus otomatis oleh browser.

## 4. Model data

Semua uang disimpan sebagai **bilangan bulat rupiah** (tanpa desimal). ID berupa string (nanoid). Tanggal transaksi disimpan sebagai string `YYYY-MM-DD` waktu lokal perangkat.

```ts
Wallet      { id, name, icon, color, startBalance: number, archived: boolean, sort: number }
Category    { id, kind: 'expense'|'income', name, icon, color, archived: boolean, sort: number, budgetPotId?: string }
Transaction { id, type: 'expense'|'income'|'transfer', amount: number, date: string,
              categoryId?: string, walletId?: string,
              fromWalletId?: string, toWalletId?: string,
              note?: string, createdAt: number, updatedAt: number }
Budget      { id, month: 'YYYY-MM', totalFund: number }
BudgetPot   { id, budgetId, name, icon, color, amount: number, sort: number, manualUsed?: number }
Settings    { id: 'main', theme, schemaVersion: number, lastBackupAt?: number, includeArchivedInTotal: boolean }
```

Aturan integritas:
- `amount` selalu > 0. Arah ditentukan oleh `type`.
- `expense` dan `income` wajib `walletId` dan `categoryId`. `transfer` wajib `fromWalletId` ≠ `toWalletId`.
- Kategori dan dompet yang dipakai transaksi tidak boleh dihapus, hanya diarsipkan.
- Saldo dompet dihitung dari data (tidak disimpan sebagai angka tersendiri) agar tidak bisa tidak sinkron.

## 5. Perhitungan

- `saldoDompet = startBalance + Σ income(wallet) − Σ expense(wallet) + Σ transferMasuk − Σ transferKeluar`
- `totalSaldo = Σ saldoDompet` (dompet aktif, atau semua jika diatur).
- `terpakaiPos = Σ expense pada kategori yang terkait pos, dalam bulan anggaran + manualUsed`
- `sisaPos = amount − terpakaiPos`
- `belumDialokasikan = totalFund − Σ amount pos`
- Persen kategori = `totalKategori / totalSeluruhKategori`, dibulatkan 1 desimal, total tampil 100%.

## 6. Layar dan navigasi

Navigasi bawah (tab bar) dengan tombol tambah di tengah.

| Tab | Isi |
|---|---|
| Beranda | Total saldo, kartu dompet, ringkasan periode, transaksi terakhir |
| Riwayat | Daftar transaksi per tanggal, pencarian, filter |
| Tambah (tombol tengah) | Lembar input transaksi (sheet dari bawah) |
| Anggaran | Total dana, daftar pos, progres, sisa |
| Statistik | Donat per kategori, tab pengeluaran/pemasukan, batang bulanan |

Layar tambahan: Kelola Dompet, Kelola Kategori (dua tab), Pemilih Ikon, Edit Transaksi, Pengaturan (ekspor/impor/tema).

Kondisi kosong:
- Belum ada dompet: ajak buat dompet pertama dan isi saldo awal (onboarding 3 langkah: dompet, saldo awal, anggaran opsional).
- Belum ada transaksi: pesan singkat yang mengarahkan ke tombol tambah.

## 7. Persyaratan non-fungsional

- **Mobile-first**: dirancang untuk lebar 360 px ke atas, area sentuh minimal 44 px, tahan safe-area.
- **Performa**: halaman pertama interaktif di bawah 2 detik pada HP kelas menengah; daftar riwayat memakai virtualisasi bila lebih dari 300 item.
- **Offline-first**: tanpa permintaan jaringan saat dipakai. Tidak ada analitik atau pelacak pihak ketiga.
- **Privasi**: data tidak pernah meninggalkan perangkat kecuali pengguna mengekspor sendiri.
- **Aksesibilitas**: kontras cukup, fokus terlihat, label pada ikon tombol, mendukung `prefers-reduced-motion`.
- **Lokalisasi**: format `Rp1.234.567`, tanggal `25 Nov 2026`, semua teks bahasa Indonesia.
- **Ketahanan data**: migrasi skema versi demi versi, ekspor memuat `schemaVersion`.

## 8. Tech stack

| Bagian | Pilihan |
|---|---|
| Build | Vite + React + TypeScript |
| Styling | Tailwind CSS |
| Penyimpanan | IndexedDB lewat Dexie |
| State | Zustand (UI) dan `useLiveQuery` Dexie (data) |
| Routing | React Router |
| Grafik | Recharts |
| Ikon | lucide-react |
| PWA | vite-plugin-pwa (Workbox) |
| Tes | Vitest + Testing Library |
| Deploy | Cloudflare Pages |

Dependensi di luar daftar ini harus ditanyakan dulu ke pemilik.

## 9. Tahap pengerjaan (untuk Claude Code)

Kerjakan berurutan. Tiap tahap selesai bila lolos kriteria dan tes, lalu commit.

1. **Fondasi**: scaffold Vite React TS, Tailwind, router, tab bar, skema Dexie, util uang dan tanggal beserta tesnya.
2. **Dompet dan kategori**: CRUD, saldo awal, pemilih ikon dan warna, data bawaan, onboarding.
3. **Transaksi**: lembar input, keypad, edit/hapus/undo, transfer, riwayat dengan pencarian dan filter.
4. **Beranda dan periode**: total saldo, saldo per dompet, ringkasan, pemilih periode.
5. **Anggaran**: total dana, pos custom, nominal dan persen, tautan kategori, progres, salin bulan lalu.
6. **Statistik**: donat, daftar per kategori, drill-down, batang bulanan.
7. **Ekspor dan impor**: JSON dan CSV, pratinjau impor, tanggal backup.
8. **PWA dan polesan**: manifest, ikon, offline, persist storage, tema, kondisi kosong, aksesibilitas, audit Lighthouse.

## 10. Kriteria penerimaan

- Mencatat pengeluaran baru selesai dalam maksimal 4 ketukan dari Beranda (tambah, jumlah, kategori, simpan).
- Total saldo sama dengan jumlah saldo semua dompet aktif, diverifikasi tes unit pada beberapa skenario (termasuk transfer dan transaksi diedit).
- Transfer tidak mengubah total saldo (kecuali biaya admin) dan tidak muncul di total pemasukan atau pengeluaran.
- Mengubah jumlah atau tanggal transaksi langsung memperbarui saldo, pos anggaran, dan statistik.
- Pos anggaran menampilkan belum dialokasikan dengan benar dan memberi peringatan saat berlebih.
- Ekspor JSON lalu impor ke data kosong menghasilkan data yang identik.
- Aplikasi bisa dipasang ke layar utama dan seluruh fitur berjalan dalam mode pesawat.
- Tidak ada angka desimal rupiah di mana pun, dan tidak ada permintaan jaringan saat dipakai.

## 11. Risiko

| Risiko | Mitigasi |
|---|---|
| Browser menghapus data IndexedDB | Minta penyimpanan persisten, pengingat backup, ekspor mudah |
| HP hilang atau ganti | Backup JSON, simpan ke Drive secara manual |
| Salah hitung karena floating point | Semua uang integer, helper terpusat dan bertes |
| Cakupan membengkak | Patuhi prioritas P0/P1/P2, tahap 8 tidak boleh memotong tahap sebelumnya |

## 12. Pertanyaan terbuka

- Apakah dompet yang diarsipkan masuk ke total saldo secara default? (usulan: tidak)
- Apakah anggaran perlu rollover sisa pos ke bulan berikutnya? (usulan: tidak di v1)
- Perlu mode sinkron antar perangkat di versi berikutnya? (v2, opsional)
