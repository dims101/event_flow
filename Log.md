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
*   **Perubahan:** Membuat berkas templat [.env.example](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/.env.example) yang berisi konfigurasi kosong standar untuk database PostgreSQL Supabase and Upstash Redis.
*   **Tujuan:** Mempermudah standardisasi konfigurasi *environment variables* lokal bagi kolaborator proyek lain.

### 4. 📱 Redesign UI Mobile-Friendly & Migrasi Emojis ke Lucide Icons
*   **Perubahan:**
    *   Memasang dependensi `lucide-react` dan mengganti seluruh visualisasi emoji di aplikasi dengan ikon vektor modern.
    *   Mengoptimalkan ukuran viewport, area sentuh (*touch target* minimum 44x44px), dan tata letak responsif pada seluruh halaman utama (Landing, Login, Register, Detail Room, Vendor View).
    *   Mendesain ulang [RundownTable.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/rooms/[id]/_components/RundownTable.tsx) dan [VendorView.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/v/[token]/_components/VendorView.tsx) agar menampilkan daftar kartu (card list) yang kompak pada tampilan layar kecil (mobile) dan tabel lengkap pada desktop.
*   **Tujuan:** Meningkatkan kegunaan (*usability*) dan kenyamanan kru lapangan dalam mengoperasikan linimasa acara langsung dari ponsel pintar saat hari-H.

### 5. 🔄 Perbaikan Bug Redirect Loop Sesi Kedaluwarsa/Terhapus
*   **Perubahan:**
    *   Membuat API handler khusus di [route.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/api/auth/clear/route.ts) untuk menghapus cookie sesi HTTP-only dari server sebelum mengalihkan pengguna ke `/login`.
    *   Menambahkan validasi status akun pengguna ke database di dalam [layout.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/layout.tsx). Jika sesi cookie masih ada tetapi akun pengguna sudah terhapus di database, sistem langsung mengalihkan ke API clear cookie untuk mencegah jebakan pengalihan tanpa akhir (*infinite redirect loop*).
*   **Tujuan:** Meningkatkan ketahanan otentikasi sistem dan mencegah aplikasi terkunci dalam siklus redirect saat token/sesi pengguna kedaluwarsa atau tidak lagi valid di database.

### 6. 🌗 Fitur Manual Switch Light Mode & Dark Mode
*   **Perubahan:**
    *   Membuat komponen [ThemeToggle.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/_components/ThemeToggle.tsx) untuk menyimpan preferensi tema pengguna di `localStorage` dan melakukan toggle kelas `.dark` di elemen HTML.
    *   Memodifikasi [layout.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/layout.tsx) dengan menambahkan atribut `suppressHydrationWarning` untuk menghilangkan pesan eror hidrasi konsol, serta menyuntikkan skrip inisialisasi tema di dalam `<head>` guna mencegah kedipan warna putih (*flash of unstyled content*).
    *   Merespons perubahan tema di [globals.css](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/globals.css) menggunakan CSS variables `:root` (Light Mode) dan `:root.dark` (Dark Mode), lengkap dengan *custom overrides* untuk kontras gradasi tulisan utama, modal backdrop, serta warna garis pembatas (border) agar tetap tajam dan mudah dibaca di kedua mode.
*   **Tujuan:** Memberikan keleluasaan bagi kru untuk memilih tema terang yang jelas di bawah terik matahari lapangan atau tema gelap bertingkat tinggi kontras di dalam ballroom yang minim cahaya.

### 7. 🎨 Perbaikan Kontras Warna & Estetika Light Mode
*   **Perubahan:**
    *   Mengganti kelas `text-white` statis menjadi `text-slate-100` (yang dipetakan secara dinamis) pada seluruh judul halaman, card, modal, dan teks statis yang sebelumnya tidak terbaca di Light Mode.
    *   Menambahkan aturan CSS dengan selektor wildcard atribut (`[class*="border-slate-"]`, `[class*="divide-slate-"]`, dan `[class*="bg-slate-900/"]`) di [globals.css](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/globals.css) agar garis batas, pembatas tabel, dan highlight kontainer yang sebelumnya menggunakan opacities tidak menjadi putih transparan yang tidak terlihat, melainkan menggunakan warna arang Atlassian (`rgba(9, 30, 66, 0.08)`).
    *   Memasang spesifikasi override gradasi warna vertikal (`bg-gradient-to-b from-white to-slate-300`) untuk judul halaman landing utama agar beralih ke warna gradasi gelap berdaya kontras tinggi di Light Mode.
*   **Tujuan:** Menghadirkan tampilan Light Mode yang tajam, bersih, memiliki batasan visual yang jelas, dan nyaman dibaca oleh pengguna.

### 8. ⚙️ Perbaikan Bug CSRF Server Action & Pencegahan Caching Redirect
*   **Perubahan:**
    *   Menambahkan konfigurasi `allowedOrigins` untuk Server Actions di [next.config.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/next.config.ts) guna mengizinkan host pengujian dan tunneling lokal (`*.ngrok-free.app`, `*.trycloudflare.com`, `*.localtunnel.me`), yang sebelumnya memblokir aksi login/register dengan galat "Invalid Server Action" saat diuji melalui gawai seluler.
    *   Menyuntikkan header `Cache-Control: no-store, max-age=0, must-revalidate` ke seluruh respon pengalihan (*redirect*) pada middleware [proxy.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/proxy.ts) dan API clear auth di [route.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/api/auth/clear/route.ts).
*   **Tujuan:** Menutup celah bug kegagalan enkripsi Server Action saat pengujian lintas perangkat, serta menghilangkan *infinite loading* akibat *redirect loop* yang disimpan di dalam cache peramban.

### 9. 🎨 Pembenahan Token Warna Tailwind (Critical UI Patch)
*   **Perubahan:**
    *   Mengoreksi 17 token warna Tailwind tidak valid/tidak terdaftar yang tersebar di `VendorView.tsx`, `ControlPanel.tsx`, `AddRundownForm.tsx`, `CreateEventModal.tsx`, `Register.tsx`, dan `RundownTable.tsx` (misalnya, `bg-emerald-555` -> `bg-emerald-505`, `text-slate-355` -> `text-slate-300`, `text-indigo-450` -> `text-indigo-400`, `placeholder-slate-655` -> `placeholder-slate-500`, dan `bg-indigo-650/15` -> `bg-indigo-600/15`).
*   **Tujuan:** Mengembalikan pewarnaan UI status koneksi, teks timer PiP, teks log aktivitas, dan label placeholder input agar merender dengan warna semantik yang benar alih-alih transparan/default browser.

### 10. ♿ Penguatan Aksesibilitas (WCAG 2.2 Compliance)
*   **Perubahan:**
    *   Menambahkan atribut `aria-label` deskriptif untuk tombol-tombol berbasis ikon saja (tombol hapus event di `RoomList.tsx`, tombol hapus rundown di `RundownTable.tsx`, dan tombol kirim WhatsApp di `SharePanel.tsx`).
    *   Menambahkan Event Listener tombol `Escape` untuk menutup `CreateEventModal.tsx` secara keyboard-native serta menyuntikkan `role="presentation"` pada elemen latar belakang (*backdrop*).
    *   Menerapkan kelas fokus visual `focus-visible:ring-1` pada tombol-tombol interaktif.
*   **Tujuan:** Memastikan aplikasi dapat digunakan dengan lancar menggunakan pembaca layar (*screen reader*) maupun keyboard di lapangan.

### 11. ⚡ Optimasi Algoritma Estimasi Waktu Rundown
*   **Perubahan:**
    *   Refaktorisasi metode kalkulasi start offset kumulatif di desktop view `RundownTable.tsx` dari perulangan kuadratik $O(N^2)$ menjadi perulangan linier tunggal $O(N)$ menggunakan variabel pelacak kumulatif sebelum pemetaan `.map()`.
    *   Menambahkan properti CSS `tabular-nums` untuk kolom perbandingan waktu numerik agar penulisan angka sejajar tegak lurus.
*   **Tujuan:** Meningkatkan efisiensi dan kecepatan render komponen rundown saat EO memuat jadwal acara yang berskala besar (>50 sesi).

### 12. 📑 Standardisasi UX Autocomplete & Tipografi Copy
*   **Perubahan:**
    *   Menyematkan properti `autoComplete` pada formulir login (`username`/`current-password`) dan registrasi (`organization`/`new-password`) untuk mempermudah deteksi pengelola kata sandi (*password managers*).
    *   Menyematkan `spellCheck={false}` pada inputsurel guna menghilangkan garis bawah merah ejaan browser.
    *   Mengonversi seluruh string dots elipsis manual `...` menjadi simbol karakter elipsis tunggal `…` sesuai pedoman typography modern, serta meloloskan tanda kutip tidak sah dalam JSX `VendorView.tsx`.
*   **Tujuan:** Menyediakan pengalaman otentikasi yang ramah pengguna serta standarisasi tipografi profesional.

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

## 📅 Pembaruan: 15 Juni 2026

### 1. 💙 Integrasi Sistem Desain Atlassian (Atlassian Design System Integration)
*   **Perubahan:** 
    *   Menerapkan spesifikasi token warna Atlassian dari [atlassian-design.md](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/atlassian-design.md) dan [atlassian-theme.json](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/atlassian-theme.json) ke dalam [globals.css](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/globals.css).
    *   Memetakan variabel CSS utama (`--bg-1` hingga `--bg-6`, `--text-1` hingga `--text-3`, `--brand-base`, `--brand-hover`, `--brand-light`, `--brand-subtle`) menggunakan skema warna **OKLCH** asli Atlassian untuk mode terang (`:root`) dan mode gelap (`:root.dark`).
    *   Menyesuaikan status warna (`--status-good`, `--status-bad`, `--status-warn`) dan latar belakang status subtil (`-bg`) dengan palet baru Atlassian untuk keselarasan visual (simetri mode terang/gelap).
*   **Tujuan:** Memastikan antarmuka EventFlow memiliki skema warna profesional, konsisten, berpusat pada pengguna, serta memenuhi rasio kontras aksesibilitas WCAG 2.2 AA secara otomatis.

---

## 🛠️ Status Kompilasi Proyek
*   **Uji Coba Build:** Berhasil dijalankan via `npm run build` pada 15 Juni 2026.
*   **Hasil:** Kompilasi sukses 100% menggunakan Next.js dengan status **Zero Errors** pada page bundle optimization.


