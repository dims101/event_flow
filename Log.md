# Log Pembaruan EventFlow

Dokumen ini mencatat log pembaruan teknis yang telah diterapkan pada aplikasi EventFlow untuk meningkatkan keandalan sistem timer dan notifikasi real-time.

---

## 📅 Pembaruan: 15 Juni 2026

### 1. 🗄️ Migrasi Database PostgreSQL Supabase
*   **Perubahan:** 
    *   Mengganti driver database Drizzle ORM dari `better-sqlite3` ke `postgres-js` (`postgres` npm package).
    *   Menghapus paket dependencies `better-sqlite3` dan `@types/better-sqlite3`.
    *   Mengubah konfigurasi `drizzle.config.ts` untuk menggunakan dialect `postgresql`.
    *   Mengonversi kolom waktu millisecond (`timerStartTime`, `createdAt`) pada [schema.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/db/schema.ts) dari `integer` ke `bigint({ mode: 'number' })` untuk mencegah batas overflow 32-bit di PostgreSQL.
    *   Mengonfigurasi koneksi pooler Supavisor (Port 6543) dengan parameter `prepare: false` pada [index.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/db/index.ts) guna mendukung mode transaksi (*Transaction Mode*) serverless.
*   **Tujuan:** Memindahkan database lokal SQLite ke infrastruktur terdistribusi cloud Supabase PostgreSQL secara andal untuk mendukung deployment produksi serverless.

### 2. 🛡️ Audit Keamanan IDOR (Insecure Direct Object Reference) & Otorisasi
*   **Perubahan:** 
    *   Menambahkan fungsi otorisasi kepemilikan ruangan (`room.userId === user.id`) pada halaman detail event [page.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/rooms/[id]/page.tsx).
    *   Mengamankan seluruh Server Actions mutasi dan kontrol di [room.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/actions/room.ts), [roomControl.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/actions/roomControl.ts), dan [rundown.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/actions/rundown.ts) dengan mencocokkan ID user dari cookie sesi terenkripsi (`getCurrentUser()`) terhadap kolom `userId` tabel `rooms` sebelum mengeksekusi operasi database.
*   **Tujuan:** Menutup celah bypass logika yang memungkinkan pengguna luar untuk menghapus room, memanipulasi waktu timer panggung, mengirim pesan prompter palsu, atau mengubah rundown acara milik EO lain hanya dengan mengirimkan/menebak parameter `roomId`.

### 3. 📝 Berkas Templat Lingkungan (.env.example)
*   **Perubahan:** Membuat berkas templat [.env.example](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/.env.example) yang berisi konfigurasi kosong standar untuk database PostgreSQL Supabase dan Upstash Redis.
*   **Tujuan:** Mempermudah standardisasi konfigurasi *environment variables* lokal bagi kolaborator proyek lain.

---

## 📅 Pembaruan: 14 Juni 2026

### 1. ⏱️ Solusi Timer Beku di Latar Belakang (Timer Throttling)
*   **Perubahan:** Mengintegrasikan pembaruan detik timer menggunakan **Web Worker** internal (via inline Blob URL) pada [ControlPanel.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/rooms/[id]/_components/ControlPanel.tsx) dan [VendorView.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/v/[token]/_components/VendorView.tsx).
*   **Tujuan:** Mengatasi pembatasan daya browser (*power-saving/throttling*) yang membekukan fungsi `setInterval` bawaan ketika tab browser di-minimize atau dipindahkan ke latar belakang. Dengan Web Worker, detak timer tetap berjalan presisi secara kontinu.

### 2. 🚨 Pembenahan Big Alert Mandiri dari Selisih Jam Perangkat (Clock-Drift Independent)
*   **Perubahan:** 
    *   Menghapus perbandingan selisih waktu mutlak sistem perangkat dengan server (`Date.now() - createdAt < 7000`) yang rentan gagal jika jam di ponsel user meleset dari jam server.
    *   Menerapkan mekanisme pencatatan kedatangan lokal berbasis ID pesan unik menggunakan `lastProcessedMessageId` dan `isInitialLoad` refs.
    *   Mengatur pemicu popup instruksi raksasa (*Big Alert*) selama tepat **7 detik** melalui state lokal yang dikelola oleh `setTimeout` client-side langsung saat data SSE diterima.
*   **Tujuan:** Menjamin pesan penting instan (*Big Alert*) 100% selalu muncul di jendela PiP tepat selama 7 detik tanpa terpengaruh oleh setelan jam atau zona waktu perangkat pengguna yang tidak akurat.

### 3. 🎨 Visualisasi Big Alert di Canvas PiP Dashboard Admin (`ControlPanel.tsx`)
*   **Perubahan:** Menambahkan fungsi rendering visual kartu *Big Alert* berwarna ungu-amber dengan pembungkus teks otomatis (*text wrapping*) ke dalam loop fungsi `draw()` pada elemen `<canvas>` di [ControlPanel.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/rooms/[id]/_components/ControlPanel.tsx).
*   **Tujuan:** Memastikan admin/show caller yang mem-float jendela PiP (melalui fallback *Canvas Video PiP* seperti di HP Android) mendapatkan tampilan visual peringatan 7 detik yang identik dengan tampilan PiP vendor ketika mereka mengirim instruksi baru.

### 4. ⚡ Pencegahan Stale Closures & Optimasi Render Loop
*   **Perubahan:** Memanfaatkan reference wrapper mutable (`stateRef`, `timerDisplayRef`, `activeAlertRef`) untuk menyuplai data state ter-update ke dalam callback loop `setInterval` / Web Worker.
*   **Tujuan:** Menghindari bug penangkapan nilai state yang kedaluwarsa (*stale closure*) serta mengeliminasi re-render komponen React yang tidak perlu selama proses ticking frekuensi tinggi (200ms).

### 5. 🕒 Indikator Status Warna & Jam Asli di PiP (Wall Clock Time)
*   **Perubahan:** 
    *   Mengganti teks status status statis (`● RUNNING`, `⏸ PAUSED`, `⏹ STOPPED`) di dalam PiP (baik pada *Document PiP* maupun *Canvas PiP* di [ControlPanel.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/rooms/[id]/_components/ControlPanel.tsx) dan [VendorView.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/v/[token]/_components/VendorView.tsx)) menjadi tampilan **jam asli lokal sekarang (jam dinding)** berformat titik dua `HH:MM:SS` (seperti `11:50:02`).
    *   Mengganti representasi status menggunakan lingkaran warna dinamis:
        *   **Hijau berdenyut (Pulsing Green dot)** untuk status *Running*.
        *   **Oranye solid (Orange dot)** untuk status *Paused*.
        *   **Merah solid (Red dot)** untuk status *Stopped*.
    *   **Reposisi & Perbesar Jam Asli:** Memindahkan letak dot status warna tersebut ke **pojok kanan atas** jendela PiP (baik menggunakan absolute positioning di Document PiP maupun penggambaran koordinat `canvas.width - 15, 15` di Canvas Fallback PiP), memposisikan jam asli secara terpusat di bagian tengah, serta memperbesar ukuran teks jam asli menjadi `text-[11px]` pada Document PiP dan `bold 14px` pada Canvas Fallback PiP.
*   **Tujuan:** Memberikan kemudahan bagi crew EO/vendor untuk memantau jam asli saat ini langsung dari jendela PiP yang selalu berada di paling depan (*Always on Top*), serta menyederhanakan indikator status agar lebih minimalis, bersih secara visual, dan tidak menghalangi tampilan waktu.

### 6. 📐 Rasio Aspek PiP Disesuaikan Kembali ke Konfigurasi Awal
*   **Perubahan:**
    *   Mengatur kembali rasio aspek default *Document PiP* menjadi **320px × 180px** (16:9).
    *   Mengatur kembali rasio aspek fallback *Canvas Video PiP* menjadi **400px × 160px** (2.5:1).
    *   Menyesuaikan ulang koordinat gambar pada Canvas (`draw()`) ke posisi semula agar teks judul, timer, indikator bulat/jam asli, dan pesan prompter terdistribusi dengan proporsional pada tinggi `160px` (yaitu Y = 28 untuk judul, Y = 85 untuk timer, Y = 120 untuk status/jam, dan Y = 144 untuk prompter).
*   **Tujuan:** Mengembalikan aspek rasio jendela melayang ke ukuran awal yang lebih kompak dan minimalis.

### 7. 📋 Sistem Log Aktivitas (Audit Log) Real-Time
*   **Perubahan:**
    *   **Skema Database:** Menambahkan skema tabel baru `activity_logs` pada [schema.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/db/schema.ts) untuk menyimpan riwayat aksi di room.
    *   **Server Actions Logging:**
        *   Mengintegrasikan perekaman aksi timer (start, pause, resume, stop, dan pindah/lompat sesi rundown) ke dalam `updateTimerStatusAction`.
        *   Mencatat penyesuaian offset waktu secara rinci (arah penyesuaian dan total offset terbaru) pada `adjustRoomOffsetAction`.
        *   Mencatat pengiriman pesan prompter live ke divisi tertentu serta pembersihan instruksi prompter pada `sendPrompterMessageAction` dan `clearPrompterMessagesAction`.
        *   Mencatat penambahan dan penghapusan item rundown acara (dilengkapi judul sesi rundown, durasi, dan target divisi) pada `addRundownItemAction` dan `deleteRundownItemAction`.
    *   **SSE Streaming & Real-time Sync:** Memodifikasi API route SSE di [route.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/api/rooms/[id]/stream/route.ts) untuk memuat 30 baris log aktivitas terbaru dan mengirimkannya ke klien secara real-time saat terjadi pembaruan status Redis.
    *   **UI Log Panel:** Menambahkan komponen visual kartu "Log Aktivitas" di bagian sidebar kanan [ControlPanel.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/rooms/[id]/_components/ControlPanel.tsx) dengan ikon-ikon jenis log yang deskriptif dan format timestamp `HH:MM:SS` presisi menggunakan pembatas titik dua.
*   **Tujuan:** Menyediakan riwayat jejak audit aktivitas yang transparan, lengkap, dan instan (real-time) bagi show caller/admin di dashboard untuk memantau semua pergerakan serta operasi acara.

---

## 🛠️ Status Kompilasi Proyek
*   **Uji Coba Build:** Berhasil dijalankan via `npm run build`.
*   **Hasil:** Kompilasi sukses 100% menggunakan Next.js (Turbopack) dengan status **Zero Errors** (baik pada parser TypeScript maupun page bundle optimization).

