# Blueprint Eksekusi AI: Aplikasi EventFlow MVP

Dokumen ini memecah seluruh siklus pengembangan aplikasi EventFlow ke dalam unit tugas terkecil berbasis alur pengguna. Eksekusi harus dilakukan secara berurutan.

---

## 🔐 Tahap 1: Setup Proyek & Alur Autentikasi (Login/Register EO)
Fokus: Membuat akun dan sistem masuk untuk penyelenggara acara (Admin EO/WO).

- [ ] **1.1. Inisialisasi Project:** Jalankan `npx create-next-app@latest eventflow` (App Router, TS, Tailwind, `/src: No`).
- [ ] **1.2. Schema Auth:** Tambahkan tabel `users` (`id`, `email`, `password_hash`, `company_name`) ke `db/schema.ts`. Jalankan `npx drizzle-kit push`.
- [ ] **1.3. Server Action Auth:** Buat `app/actions/auth.ts` berisi fungsi `registerAction` dan `loginAction` (menggunakan pustaka `bcryptjs` untuk *hashing* dan mengenkripsi sesi ke dalam HTTP-only Cookie).
- [ ] **1.4. Middleware Proteksi:** Buat file `middleware.ts` di akar direktori untuk memeriksa cookie sesi. Jika tidak ada cookie, tendang pengguna dari rute `/dashboard` ke `/login`.
- [ ] **1.5. Halaman Register:** Buat halaman `app/register/page.tsx` dengan form: Nama Perusahaan, Email, Password, dan tombol submit yang memicu `registerAction`.
- [ ] **1.6. Halaman Login:** Buat halaman `app/login/page.tsx` dengan form: Email, Password, dan tombol submit yang memicu `loginAction`. Jika sukses, arahkan ke `/dashboard`.

---

## 🏢 Tahap 2: Alur Dasbor & Pembuatan Event Baru (Create Event)
Fokus: EO dapat melihat daftar acara mereka dan membuat ruang acara baru.

- [ ] **2.1. Layout Dasbor:** Buat berkas `app/dashboard/layout.tsx` yang menyediakan struktur navigasi atas (Navbar) dengan tombol "Logout".
- [ ] **2.2. Halaman Daftar Event:** Buat `app/dashboard/page.tsx` (Server Component) untuk menarik dan menampilkan semua daftar baris data dari tabel `rooms` yang dimiliki oleh `userId` pengguna yang sedang aktif.
- [ ] **2.3. Komponen Modal "Buat Event":** Buat komponen `app/dashboard/_components/CreateEventModal.tsx` menggunakan dialog HTML statis atau Tailwind. Form berisi: Nama Event dan Tanggal Pelaksanaan.
- [ ] **2.4. Server Action Simpan Event:** Buat `app/actions/room.ts` dengan fungsi `createRoomAction`. Fungsi ini melakukan:
  - [ ] Menyimpan baris baru ke tabel `rooms`.
  - [ ] Menghasilkan 4 string acak unik menggunakan `crypto.randomUUID()` untuk token akses vendor (MC, Catering, MUA, All).
  - [ ] Menyimpan keempat token tersebut ke tabel `role_tokens`.
- [ ] **2.5. Hubungkan Form ke Action:** Pasang `createRoomAction` ke dalam form di dalam `CreateEventModal.tsx`. Pastikan setelah sukses, modal tertutup dan halaman melakukan `router.refresh()`.

---

## 📝 Tahap 3: Alur Penyusunan Jadwal Acara (Rundown Builder)
Fokus: Menyusun konten acara, durasi, dan menetapkan divisi vendor yang bertanggung jawab.

- [ ] **3.1. Halaman Manajemen Ruangan:** Buat rute dinamis `app/dashboard/rooms/[id]/page.tsx`. Halaman ini menampilkan detail nama acara dan memiliki dua tab utama: "Susun Rundown" dan "Pusat Kendali Hari-H".
- [ ] **3.2. Form Input Rundown:** Buat Client Component `app/dashboard/rooms/[id]/_components/AddRundownForm.tsx` dengan input: Nama Sesi (cth: *Sambutan Pihak Wanita*), Durasi (dalam menit), dan Target Divisi (Dropdown pilihan: *All, MC, Catering, MUA, Dokumentasi*).
- [ ] **3.3. Server Action Simpan Item Jadwal:** Buat berkas `app/actions/rundown.ts` dengan fungsi `addRundownItemAction` untuk mendesak data ke tabel `rundown_items` dengan kalkulasi urutan otomatis (`order_index`).
- [ ] **3.4. Komponen Tabel Rundown:** Buat komponen `RundownTable.tsx` untuk menampilkan daftar jadwal yang sudah dibuat. Lengkapi dengan tombol hapus yang memicu Server Action `deleteRundownItemAction`.

---

## 🔗 Tahap 4: Alur Distribusi Tautan Akses Vendor (Share Links)
Fokus: Menyediakan tautan khusus tanpa login untuk para vendor lapangan.

- [ ] **4.1. Komponen Panel Berbagi:** Buat Client Component `SharePanel.tsx` di dalam halaman detail ruangan.
- [ ] **4.2. Pengambilan Data Token:** Buat fungsi API internal atau fungsi komponen untuk membaca token dari tabel `role_tokens` berdasarkan `room_id`.
- [ ] **4.3. Fitur Salin Tautan Quick-Copy:** Tampilkan daftar kartu untuk setiap peran (MC, Catering, MUA). Setiap kartu memiliki tombol "Salin Tautan WhatsApp" yang menghasilkan URL berformat: `${process.env.NEXT_PUBLIC_APP_URL}/v/[token]`.

---

## 🎛️ Tahap 5: Pusat Kendali Utama Hari-H (Show Caller Dashboard)
Fokus: Panel kontrol waktu dan prompter teks *real-time* yang dipegang oleh pimpinan acara saat acara berlangsung.

- [ ] **5.1. Integrasi Upstash Redis:** Setup file `lib/redis.ts`. Pastikan koneksi ke Upstash Redis bekerja untuk fungsi `redis.set()` dan `redis.get()`.
- [ ] **5.2. API Route Server-Sent Events (SSE):** Buat berkas `app/api/rooms/[id]/stream/route.ts`. Rute ini harus mempertahankan koneksi HTTP terbuka (`text/event-stream`) dan mengirim data baru ke browser setiap kali ada aktivitas perubahan data pada *room* bersangkutan di Redis.
- [ ] **5.3. Komponen Jam Makro (Timer Master):** Buat komponen `MasterTimer.tsx` yang menampilkan sesi aktif saat ini, hitung mundur sisa waktu panggung, dan status sesi berikutnya.
- [ ] **5.4. Tombol Intervensi Waktu (Macro Offset):** Di dalam panel kontrol, buat tombol fisik `+1 Menit`, `+5 Menit`, `-1 Menit`. Tombol ini memicu Server Action `updateRoomOffsetAction` yang memperbarui nilai `current_offset_seconds` di Redis.
- [ ] **5.5. Input Pesan Instan (Prompter Sender):** Buat form teks di bawah layar kontrol untuk mengetik instruksi singkat, memilih target vendor dari dropdown, lalu mengirimnya ke memori Redis saat tombol "Kirim Pesan" ditekan.

---

## 📱 Tahap 6: Tampilan Gawai Lapangan Vendor (Vendor Mobile View)
Fokus: Layar super ringan di HP vendor yang menerima data waktu dan instruksi prompter secara instan tanpa proses login.

- [ ] **6.1. Halaman Rute Dinamis Vendor:** Buat halaman `app/v/[token]/page.tsx` sebagai Server Component. Ambil data token dari database untuk mengetahui peran vendor tersebut dan `room_id` asalnya.
- [ ] **6.2. UI Mobile-First Rendah Hambatan:** Desain komponen `VendorView.tsx` dengan CSS Tailwind yang dioptimalkan untuk layar vertikal ponsel. Tampilkan jam hitung mundur berukuran raksasa.
- [ ] **6.3. Sambungan Klien SSE:** Di dalam komponen, pasang React `useEffect` untuk membuka koneksi ke `/api/rooms/[roomId]/stream`.
- [ ] **6.4. Handler Event Perubahan Waktu:** Jika menerima pesan tipe `offset_changed` dari SSE, perbarui variabel state komponen untuk menggeser penghitungan jam lokal seketika tanpa *refresh* browser.
- [ ] **6.5. Handler Komunikasi Prompter & Getar:** Jika menerima data tipe `prompter_message` dan targetnya sesuai dengan peran vendor tersebut, munculkan kotak pesan penuh warna berkedip di layar dan pemicu fungsi `navigator.vibrate([300, 150, 300])`.

---

## ✈️ Tahap 7: Proteksi Sinyal Buruk & Kapabilitas Offline (Offline-First)
Fokus: Menjamin aplikasi tidak mogok atau memunculkan layar putih kosong saat koneksi internet di lokasi acara terputus total.

- [ ] **7.1. Pasang Konfigurasi PWA:** Tambahkan plugin `@ducanh2912/next-pwa` ke dalam berkas `next.config.js`. Buat file `public/manifest.json` standar yang berisi ikon dan nama aplikasi EventFlow.
- [ ] **7.2. Inisialisasi Database Lokal Browser:** Buat berkas `lib/localDb.ts` yang menginisialisasi Dexie.js (IndexedDB) untuk membuat penyimpanan lokal bernama `rundown_cache`.
- [ ] **7.3. Caching Otomatis:** Ubah logika di dalam `VendorView.tsx` agar setiap kali data *rundown* segar berhasil diterima lewat jalur SSE, data tersebut langsung menduplikasi dan menulis ulang dirinya ke IndexedDB lokal.
- [ ] **7.4. Interseptor Status Jaringan:** Tambahkan pendengar *event* global `window.addEventListener('offline')` pada gawai vendor. Jika status berganti ke offline, ubah indikator status sistem menjadi kuning tulisan *"Mode Mandiri (Offline)"* dan alihkan pembacaan sumber data *rundown* sepenuhnya dari database IndexedDB lokal. Jam hitung mundur harus tetap berjalan presisi menggunakan sinkronisasi jam internal gawai.