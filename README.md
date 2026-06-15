# 🌊 EventFlow — Real-Time Event Rundown Orchestrator

**EventFlow** adalah platform manajemen rundown dan alur acara real-time yang dirancang khusus untuk memfasilitasi koordinasi antara **Event Organizers (EO/WO)** dan **kru/vendor di lapangan** (seperti MC, Catering, MUA, Dokumentasi, dll.). 

Aplikasi ini berfokus pada sinkronisasi waktu panggung yang presisi, pengiriman instruksi instan (*prompter*), serta ketahanan sistem yang tinggi terhadap sinyal buruk di lokasi acara (*offline-first*).

---

## 🚀 Fitur Utama

EventFlow dirancang untuk mengatasi masalah klasik koordinasi event: miskomunikasi waktu, perubahan jadwal mendadak di panggung, dan hilangnya sinyal internet. Berikut fitur-fitur utamanya:

### 1. 🔐 Autentikasi EO & Keamanan Sesi
* Login dan Register khusus untuk akun Event Organizer (EO/WO).
* Autentikasi aman berbasis enkripsi sesi pada cookie HTTP-only menggunakan `bcryptjs`.
* Proteksi rute dasbor menggunakan Next.js Middleware.
* **Otorisasi Ketat & Proteksi IDOR**: Menjamin keamanan akses data dengan validasi kepemilikan ruangan (`room.userId === user.id`) di semua kueri Server Actions dan halaman detail ruangan untuk mencegah manipulasi data antar-pengguna.

### 2. 🏢 Dashboard & Pembuatan Event (Rooms)
* EO dapat mengelola banyak acara sekaligus dalam satu dasbor.
* Sistem generate token akses unik untuk setiap divisi vendor secara otomatis (`MC`, `Catering`, `MUA`, `All`) saat ruang acara dibuat.

### 3. 📝 Rundown Builder Kolaboratif
* Penyusunan rundown acara secara terstruktur dengan penentuan durasi (menit) dan penetapan target divisi vendor yang bertanggung jawab.
* Pengaturan urutan otomatis (*auto-ordering*) untuk setiap sesi panggung.

### 4. 🔗 Distribusi Akses Tanpa Login (Quick-Share Links)
* Vendor lapangan tidak perlu membuat akun atau login.
* Tombol salin tautan instan ke WhatsApp yang mengarahkan langsung ke halaman pantau vendor sesuai token peran mereka (`/v/[token]`).

### 5. 🎛️ Pusat Kendali Hari-H (Show Caller Dashboard)
* Panel kontrol eksklusif bagi pimpinan acara (*Show Caller* / *Stage Manager*).
* **Master Timer**: Jam makro yang menampilkan hitung mundur panggung sesi aktif dan persiapan sesi berikutnya.
* **Macro Offset**: Tombol intervensi waktu instan (`+1m`, `+5m`, `-1m`) yang langsung mengubah perhitungan waktu mundur di seluruh gawai vendor secara real-time melalui Redis.
* **Instant Prompter**: Form pengiriman pesan teks kilat ke divisi vendor tertentu dengan efek kedipan layar dan getaran gawai (*haptic feedback*).

### 6. 📺 Jendela Melayang Picture-in-Picture (PiP)
* **Document PiP API**: Mendukung pembukaan jendela melayang asli (320px × 180px, rasio 16:9) yang selalu berada di paling depan (*Always on Top*) di desktop.
* **Canvas Fallback PiP**: Fallback untuk browser seluler/Android yang tidak mendukung Document PiP dengan merender seluruh status visual ke elemen `<canvas>` (400px × 160px, rasio 2.5:1) dan merekam stream videonya untuk diproyeksikan ke sistem PiP bawaan.
* **Wall Clock Time**: Menampilkan jam dinding asli lokal saat ini secara terpusat di tengah jendela PiP untuk memudahkan crew memantau jam aktual.
* **Minimalist Status Indicator**: Dot status visual di pojok kanan atas: hijau berdenyut (running), oranye solid (paused), dan merah solid (stopped).

### 7. 📋 Sistem Log Aktivitas (Audit Log) Real-Time
* **Jejak Audit Otomatis**: Setiap perubahan timer (start, pause, resume, stop, skip), offset waktu panggung, modifikasi rundown, serta pengiriman prompter dicatat langsung ke tabel database `activity_logs`.
* **Streaming Log Instan**: Terintegrasi dengan Server-Sent Events (SSE) untuk mengirimkan 30 baris log aktivitas terbaru secara real-time.
* **UI Log Panel**: Panel visual berikon di sebelah kanan dasbor admin yang menunjukkan aktivitas secara terperinci dengan format timestamp `HH:MM:SS`.

### 8. 📱 Tampilan Gawai Lapangan Vendor (Vendor Mobile View)
* Tampilan web *mobile-first* yang ringan, bersih, dan hemat daya.
* Jam hitung mundur raksasa yang sinkron secara real-time menggunakan **Server-Sent Events (SSE)**.
* Notifikasi visual berkedip dan getaran (*vibrate*) ketika menerima pesan prompter dari Show Caller.

### 9. ✈️ Proteksi Sinyal Buruk (Offline-First)
* Dukungan penuh **Progressive Web App (PWA)** sehingga aplikasi dapat diinstal di HP android/iOS dan tetap terbuka tanpa layar putih kosong jika sinyal hilang total.
* **Local Caching**: Sinkronisasi data rundown otomatis ke database lokal browser (**IndexedDB** via **Dexie.js**).
* **Network Status Interceptor**: Deteksi otomatis status koneksi. Saat offline, aplikasi akan membaca rundown dari penyimpanan lokal dan tetap menjalankan hitung mundur secara presisi menggunakan sinkronisasi jam internal gawai.

---

## 🔧 Optimasi Performa & Keandalan Teknis

Berdasarkan pembaruan terbaru, EventFlow mengimplementasikan optimasi sistem berikut:

* **Anti-Throttling Timer**: Detak timer menggunakan internal **Web Worker** (via inline Blob URL) pada `ControlPanel.tsx` dan `VendorView.tsx` agar hitung mundur tetap berjalan presisi 100% saat aplikasi berjalan di latar belakang (*background tab* / layar ponsel mati).
* **Clock-Drift Independent Alert**: Mekanisme pemicu *Big Alert* yang tidak bergantung pada selisih waktu perangkat-server melainkan pelacakan ID pesan (`lastProcessedMessageId`) untuk menjamin alert muncul tepat selama 7 detik di seluruh perangkat terlepas dari ketidakakuratan jam pengguna.
* **Stale Closures & Render Loop Optimization**: Penggunaan mutable references wrapper (`stateRef`, `timerDisplayRef`, `activeAlertRef`) untuk menyuplai data state ter-update ke dalam loop frekuensi tinggi (200ms) guna mencegah pemborosan re-render komponen React.

---

## 🛠️ Tech Stack & Arsitektur

Platform ini dibangun menggunakan teknologi modern yang memastikan performa tinggi dan latensi rendah:

* **Core Framework**: [Next.js](https://nextjs.org/) (App Router, TypeScript)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/)
* **Database Relasional**: [PostgreSQL](https://www.postgresql.org/) via [Supabase](https://supabase.com/) & [Drizzle ORM](https://orm.drizzle.team/)
* **Real-time Synchronization**: **Supabase Realtime** via `@supabase/supabase-js` — mendengarkan perubahan langsung dari PostgreSQL database via WebSocket untuk sinkronisasi instan di browser tanpa membebani server/database dengan query berulang (Zero DB Query overhead untuk event).
* **Real-time State & Cache (Legacy/Backend)**: [Upstash Redis](https://upstash.com/) via `@upstash/redis` SDK — dipertahankan untuk pencatatan cadangan dan fallbacks. Mendukung mode in-memory mock untuk pengembangan lokal.
* **Offline Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
* **PWA Enabler**: `@ducanh2912/next-pwa`

---

## 📁 Struktur Folder Utama

```text
eventflow/
├── public/                 # Aset publik, ikon, dan manifest.json PWA
├── src/
│   ├── app/
│   │   ├── actions/        # Server Actions (auth, room, rundown, dll.)
│   │   ├── api/            # API Routes (SSE Stream /api/rooms/[id]/stream - legacy)
│   │   ├── dashboard/      # Panel Dashboard EO & Show Caller
│   │   ├── login/          # Halaman Masuk EO
│   │   ├── register/       # Halaman Daftar EO
│   │   ├── v/              # Tampilan Mobile Vendor (/v/[token])
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── db/                 # Konfigurasi Drizzle & PostgreSQL Schema
│   └── lib/                # Utilitas (Redis client, Supabase client, Dexie helper)
├── middleware.ts           # Proteksi sesi rute dasbor
├── next.config.ts          # Konfigurasi Next.js & Integrasi PWA
└── package.json
```

---

## ⚙️ Cara Menjalankan Proyek Secara Lokal

### 1. Prasyarat
Pastikan Anda sudah menginstal **Node.js** (v18+) dan memiliki akun **Supabase** (untuk database PostgreSQL).

> **Upstash Redis bersifat opsional untuk development lokal.** Jika `REDIS_URL` dan `REDIS_TOKEN` tidak diisi atau masih berisi nilai placeholder, sistem secara otomatis beralih ke mode in-memory mock sehingga aplikasi tetap bisa dijalankan tanpa konfigurasi Redis.

### 2. Kloning & Instal Dependency
```bash
npm install
```

### 3. Setup Environment Variables
Buat berkas `.env` di akar direktori dan lengkapi variabel berikut (lihat [.env.example](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/.env.example) sebagai templat):
```env
# Database Connection (Supabase PostgreSQL via Supavisor Pooler Port 6543)
DATABASE_URL="postgresql://postgres.xxxx:[password]@aws-xxxx.pooler.supabase.com:6543/postgres?sslmode=require"

# Upstash Redis — Opsional untuk dev lokal, wajib untuk produksi
# Ambil dari: console.upstash.com → Database → REST API
REDIS_URL="https://your-instance.upstash.io"
REDIS_TOKEN="your_upstash_rest_token"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
SESSION_SECRET="gunakan_string_acak_dan_panjang_di_sini"
```

### 3a. (Opsional) Setup Upstash Redis untuk Produksi
Jika ingin mengaktifkan sinkronisasi real-time lintas perangkat/server:
1. Buat akun gratis di [upstash.com](https://upstash.com)
2. Buat database baru → pilih region **`ap-southeast-1` (Singapore)**
3. Buka tab **REST API** → salin `UPSTASH_REDIS_REST_URL` ke `REDIS_URL` dan `UPSTASH_REDIS_REST_TOKEN` ke `REDIS_TOKEN` di `.env`
4. Jalankan ulang server — log `🔌 Upstash Redis initialized successfully.` akan muncul di konsol

### 4. Push Skema ke Supabase
Jalankan perintah push skema Drizzle ke database PostgreSQL Supabase Anda:
```bash
npx drizzle-kit push
```

### 5. Jalankan Server Development
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) pada browser Anda.
