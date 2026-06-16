# Log Pembaruan EventFlow

Dokumen ini mencatat log pembaruan teknis yang telah diterapkan pada aplikasi EventFlow untuk meningkatkan keandalan sistem timer dan notifikasi real-time.

---

## 📅 Pembaruan: 16 Juni 2026

### 1. 🕒 Fitur Waktu Mulai Rundown (Rundown Start Time)
*   **Perubahan:**
    *   **Skema Database:** Menambahkan kolom `rundownStartTime` pada tabel `rooms` dengan nilai *default* `'08:00'`.
    *   **Input Form & Server Action:** Memodifikasi form pembuatan Event (`CreateEventModal.tsx`) dan `createRoomAction` agar EO dapat langsung menentukan jam mulai rundown di awal pembuatan ruangan.
    *   **Inline Edit Header:** Menambahkan antarmuka edit *inline* di *header* tabel jadwal (`RundownTable.tsx`) yang memanggil `updateRoomStartTimeAction`. Perubahan jam akan langsung merender ulang seluruh durasi sesi di bawahnya tanpa memuat ulang layar penuh.
    *   **Kalkulasi Waktu Aktual:** Mengubah format kolom Estimasi Mulai yang awalnya berbasis *offset* (`+00:00 - +00:10`) menjadi jam absolut dalam format 24 jam (misalnya `08:00 - 08:10`). Angka jam dihitung dinamis menggunakan fungsi kustom `formatSessionTime` yang mengakumulasikan `durationMinutes` dari indeks atas ke bawah.
    *   **Penyesuaian UI Tabel:** Memodifikasi proporsi lebar tabel *Desktop* dengan mengalokasikan porsi lebar kolom secara eksplisit (seperti `w-[25%]` untuk Sesi dan `w-[30%]` untuk Kru Target) agar antarmuka tidak melar, serta menerapkan huruf *Geist Mono 400 12px* pada kolom Durasi agar tampil lebih estetik dan *tabular*.
*   **Tujuan:** Memberikan patokan waktu nyata berbasis jam aktual bagi *Show Caller* dan vendor lapangan alih-alih mengandalkan durasi offset semu, serta menghadirkan antarmuka tabel yang lebih proporsional di layar lebar.

### 2. 🐛 Perbaikan Bug & Peringatan Hydration Next.js
*   **Perubahan:**
    *   **Migrasi Next Script:** Memperbaiki peringatan *Encountered a script tag while rendering React component* di `layout.tsx` dengan memanfaatkan komponen resmi `<Script strategy="beforeInteractive">` bawaan `next/script` untuk skrip inisialisasi mode gelap (*dark mode*).
    *   **Sinkronisasi Drizzle Schema:** Memperbaiki masalah *Failed Query (column rundown_start_time does not exist)* dan perambatan *Runtime Error Performance Measure* di *server-side rendering* dengan mengeksekusi langsung fail migrasi mandiri (`migrate.ts`) yang tersambung ke `dotenv` untuk mendorong perubahan skema baru ke *cloud database* PostgreSQL Supabase.
*   **Tujuan:** Menjaga kebersihan *render* aplikasi dari *error* interupsi Next.js dan menjamin stabilitas migrasi basis data antar lingkungan pengembangan.

### 3. ✏️ Fitur Edit Sesi Rundown (Inline Edit)
*   **Perubahan:**
    *   **UI Edit Form (Mobile & Desktop):** Menambahkan tombol edit (ikon pensil) pada setiap item rundown di `RundownTable.tsx`. Ketika diklik, baris tersebut secara reaktif berubah menjadi form *inline* tanpa mengganggu tata letak keseluruhan. Pengguna dapat mengubah nama sesi, durasi, dan mengatur ulang target PIC.
    *   **Server Action `editRundownItemAction`:** Membuat fungsi asinkron baru di `rundown.ts` yang menangani pembaruan data sesi ke basis data Supabase PostgreSQL dengan aman dan efisien.
    *   **Refresh State Otomatis:** Memanfaatkan `router.refresh()` dan sistem reaktivitas React untuk merender ulang tabel saat pembaruan berhasil, sehingga menghindari *delay* atau perpindahan halaman yang tidak perlu.
*   **Tujuan:** Memberikan kemudahan dan kecepatan bagi EO dalam memodifikasi sesi rundown secara *on-the-fly* langsung di antarmuka halaman tanpa perlu menavigasi ke modal atau *form* terpisah.

### 2. 🐛 Perbaikan Bug Drag-and-Drop (DND)
*   **Perubahan:**
    *   **Penghapusan ID Duplikat:** Menghilangkan duplikasi `draggableId` yang sebelumnya bentrok antara *view* mobile dan desktop dengan menambahkan prefix unik (`mobile-{id}` dan `desktop-{id}`).
    *   **Pencegahan Invariant Error DND:** Menyertakan prop `isDragDisabled={editingItemId === item.id}` pada komponen `<Draggable>` serta menyertakan `dragHandleProps` cadangan (pada `div` tersembunyi) di dalam form *inline edit* untuk mematuhi aturan ketat (*invariant constraints*) dari pustaka `@hello-pangea/dnd`.
    *   **Optimalisasi `suppressHydrationWarning`:** Menghapus state `isMounted` yang sebelumnya menyebabkan jeda kosong visual (1.5 detik) dan menggantinya dengan atribut peringatan hidrasi agar *render* tabel berjalan seketika (*instant*).
*   **Tujuan:** Memastikan fitur *drag-and-drop* berjalan responsif dan presisi pada perangkat layar sentuh dan *desktop*, serta menghilangkan pesan galat merah di konsol *developer* saat mode *editing* diaktifkan.

---
## 📅 Pembaruan: 15 Juni 2026 (Bagian 4 - Fitur Monitor Panggung)

### 1. 📺 Monitor Panggung — Tampilan Timer Fullscreen untuk TV / Proyektor
*   **Perubahan:**
    *   **Token Role `'Monitor'` Otomatis:** Memperbarui `createRoomAction` di [room.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/actions/room.ts) agar setiap room baru secara otomatis men-generate dua token: `'All'` (shared vendor link) dan `'Monitor'` (stage display link). Token `'Monitor'` memiliki URL terpisah di route `/monitor/[token]`, bukan `/v/[token]`.
    *   **Server Action `generateMonitorTokenAction`:** Menambahkan action baru di [room.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/actions/room.ts) yang memungkinkan room lama (yang belum memiliki token Monitor) untuk meng-generate token Monitor secara on-demand tanpa perlu membuat ulang room. Action bersifat idempoten — aman dipanggil berulang kali, mengembalikan token yang sudah ada jika sudah digenerate sebelumnya.
    *   **Route `/monitor/[token]` (Server Component):** Membuat halaman baru [page.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/monitor/[token]/page.tsx) yang mem-resolve token Monitor dari database, memverifikasi bahwa role-nya adalah `'Monitor'`, mengambil data room dan rundown, lalu merender komponen `MonitorView`. Menampilkan halaman error informatif jika token tidak valid.
    *   **Komponen `MonitorView.tsx` (Client Component):** Membuat komponen tampilan fullscreen [MonitorView.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/monitor/[token]/_components/MonitorView.tsx) dengan spesifikasi desain TV/proyektor:
        *   Latar hitam penuh (`background: #000`) dengan grain texture subtle untuk tampilan premium.
        *   Logo EventFlow (ikon SVG + teks) di bagian atas.
        *   Nama sesi aktif dalam huruf kapital, letter-spacing lebar.
        *   Timer besar berbasis `vw` (font-size `26vw`) yang mengisi hampir seluruh layar, berubah merah dan berdenyut saat overtime.
        *   Semua elemen menggunakan unit `vw/vh` sehingga otomatis menyesuaikan ukuran layar TV apapun.
        *   **Tidak ada elemen UI lain** (tidak ada tombol, tidak ada status koneksi, tidak ada header).
    *   **Real-time via Supabase Realtime:** Monitor berlangganan dua channel Supabase Realtime:
        *   `UPDATE` pada tabel `rooms` untuk memperbarui timer dan nama sesi aktif secara live.
        *   `INSERT` pada tabel `prompter_messages` — **hanya memproses pesan dengan `target_role = 'Monitor'`**. Pesan dengan target `'All'` diabaikan sepenuhnya di sisi klien tanpa perlu filter server.
    *   **Tidak ada Push Notification:** Monitor Panggung tidak mendaftarkan service worker, tidak meminta izin notifikasi, dan tidak memiliki fitur getar/suara. Penerimaan pesan murni melalui WebSocket Supabase Realtime.
    *   **Animasi Pesan Masuk (15 Detik):** Saat pesan bertarget `'Monitor'` masuk, timer mengecil dari `26vw` ke `14vw` (transisi CSS cubic-bezier), dan di bawahnya muncul kotak pesan dengan animasi slide-up. Pesan mulai fade-out pada detik ke-13.5 dan hilang sepenuhnya pada detik ke-15 (timer kembali besar otomatis).
    *   **Web Worker Timer:** Menggunakan Web Worker inline (Blob URL) untuk tick 200ms yang sama seperti `ControlPanel.tsx` — tahan terhadap throttling tab background.

### 2. 🔗 Pembaruan SharePanel — Card Monitor Panggung
*   **Perubahan:**
    *   Menambahkan prop `roomId` pada [SharePanel.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/rooms/[id]/_components/SharePanel.tsx) dan meneruskannya dari [page.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/rooms/[id]/page.tsx).
    *   **Card Monitor Panggung:** Menampilkan card kedua di sebelah kanan card "Monitor Bersama" dengan label "Stage Display", URL `/monitor/[token]`, tombol salin link, dan tombol kirim WhatsApp.
    *   **Tombol Aktifkan Monitor (room lama):** Jika room belum punya token Monitor, menampilkan card dashed dengan tombol "Aktifkan Monitor Panggung". Setelah diklik, memanggil `generateMonitorTokenAction` dan memperbarui state lokal secara optimistis — card langsung berubah menjadi card Monitor lengkap tanpa reload halaman.
    *   **Layout Dua Kolom:** Mengubah layout dari stack vertikal menjadi `grid grid-cols-1 sm:grid-cols-2 gap-4` — kedua card berdampingan kiri-kanan di desktop, atas-bawah di mobile.
    *   **Gaya Seragam:** Card Monitor Panggung menggunakan gaya identik dengan card Monitor Bersama (slate/dark), tidak ada aksen violet mencolok.

### 3. 📡 Pembaruan ControlPanel — Opsi Target Prompter Monitor
*   **Perubahan:**
    *   Menambahkan opsi `📺 Monitor Panggung` (value: `'Monitor'`) pada dropdown "Divisi Target" di [ControlPanel.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/rooms/[id]/_components/ControlPanel.tsx), ditempatkan tepat di bawah opsi "Semua (All)".
    *   EO harus **secara eksplisit memilih "Monitor Panggung"** untuk mengirim pesan ke layar monitor — pesan dengan target "Semua (All)" tidak tampil di monitor.
*   **Tujuan:** Memungkinkan Show Caller mengirim instruksi khusus ke layar monitor panggung (TV/proyektor) secara eksklusif, terpisah dari instruksi yang dikirim ke kru lapangan.

---

## 📅 Pembaruan: 15 Juni 2026 (Bagian 3 - Sidebar Playlist Rundown di Picture-in-Picture)

### 1. 📋 Jendela Samping Playlist Rundown di Jendela Melayang (PiP Sidebar Playlist)
*   **Perubahan:**
    *   **Document PiP Grid Layout & Optimization (`ControlPanel.tsx` & `VendorView.tsx`):** Memperluas dimensi viewport Document PiP menjadi `480px × 200px` dan mengoptimalkan pembagian ruang kolom dengan proporsi `grid-cols-[0.45fr_1.55fr]`. Lebar playlist dipersempit kembali menjadi hanya 22.5% dari lebar layar (turun dari 30% sebelumnya) untuk memberikan ruang sebesar-besarnya (77.5%) bagi area penayangan waktu.
    *   **Pembesaran Skala Teks (Font Scaling):**
        *   **Timer Utama:** Diperbesar kembali dari `text-5xl font-black` ke `text-6xl font-black` agar digit angka terlihat sangat masif dan jelas.
        *   **Sesi Rundown:** Diperbesar dari `13px` (aktif) / `11px` (tidak aktif) menjadi `16px font-bold` (aktif) / `13px` (tidak aktif).
        *   **Jam Dinding:** Diperbesar dari `text-xs` (12px) ke `text-base` (16px) dengan padding proporsional.
        *   **Judul Sesi Aktif:** Diperbesar dari `text-[8px]` ke `text-sm font-bold`.
        *   **Pesan Prompter:** Diperbesar dari `text-[10px]` ke `text-xs`.
    *   **Penyederhanaan Sesi & Wrapping Teks:** Menghapus durasi sesi (`m`) dari daftar playlist rundown dan mengizinkan nama sesi yang panjang untuk melakukan pembungkusan teks (*text wrapping*) otomatis hingga maksimal 2-3 baris menggunakan CSS `-webkit-line-clamp: 3`.
    *   **Page-Based Chunk Pagination:** Membatasi jumlah sesi yang ditampilkan dalam jendela melayang (PiP) menjadi maksimal 5 sesi saja (turun dari 8 sesi sebelumnya) untuk mencegah munculnya scrollbar. Mengimplementasikan pembagian halaman otomatis: sesi 1-5 ditampilkan di halaman pertama, sesi 6-10 di halaman kedua (indeks 5 ke atas), sesi 11-15 di halaman ketiga, dst. (`page = Math.floor(curIdx / 5)`, `start = page * 5`) baik di Document PiP maupun Canvas fallback PiP.
    *   **Canvas Fallback PiP Partitioning (`ControlPanel.tsx` & `VendorView.tsx`):** Membagi area canvas fallback PiP (`400px × 160px`) menjadi dua bagian dengan memosisikan garis separator vertikal lebih ke kiri (`leftWidth = 75` dari sebelumnya `100`, setara tepat 18.75% lebar kanvas) untuk memaksimalkan lebar area timer (centered pada `rightCenterX = 242`).
    *   **Canvas Text Scaling & Wrapping:** Mengonfigurasi pemotong kata dinamis di Canvas fallback untuk melayani font baru yang lebih besar (aktif: `14px sans-serif`, tidak aktif: `11px sans-serif`), memaketkan wrapping judul hingga 3 baris dengan line-height `15px` / `12px` dinamis. Timer diperbesar dari `54px` menjadi `64px`, jam dinding diperbesar dari `13px` menjadi `16px`, judul sesi aktif dari `12px` ke `15px`, dan pesan prompter ke `13px`.
*   **Tujuan:** Memaksimalkan keterbacaan digit angka timer utama dalam jendela melayang (PiP) serta memastikan seluruh nama sesi yang panjang tetap terbaca seutuhnya tanpa terpotong elipsis satu baris.

---

## 📅 Pembaruan: 15 Juni 2026 (Bagian 2 - Sistem PIC Dinamis & Tautan Bersama)

### 1. 🗃️ Migrasi ke Sistem PIC (Person In Charge) Dinamis
*   **Perubahan:**
    *   **Skema Database:** Menambahkan tabel `pics` pada [schema.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/db/schema.ts) untuk mengelola PIC dinamis per ruangan, serta menambahkan kolom `targetPics` (JSON array text) pada tabel `rundownItems` untuk menyimpan multi-relasi PIC per sesi.
    *   **Database Migration:** Mengeksekusi skema migrasi baru ke Supabase PostgreSQL untuk membuat tabel `pics` dan menambahkan kolom `target_pics` secara non-destructive dengan driver `postgres` dalam script [migrate.js](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/scratch/migrate.js).
    *   **PIC Server Actions:** Membuat berkas [pic.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/actions/pic.ts) dengan server actions: `getPicsAction`, `addPicAction`, dan `deletePicAction` untuk manajemen PIC dinamis per ruangan.
    *   **Room Seeding & Token Generation:** Memperbarui `createRoomAction` di [room.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/actions/room.ts) untuk menanamkan (*seed*) PIC default (`MC`, `MUA`, `Fotografer`) secara otomatis saat pembuatan ruangan baru, dan hanya men-generate satu token akses bersama dengan peran `'All'`.
    *   **Rundown Items Refactor:** Memperbarui `addRundownItemAction` di [rundown.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/actions/rundown.ts) untuk menyimpan array PIC terpilih sebagai string JSON pada kolom `targetPics` dengan tetap menulis string comma-separated ke `targetRole` untuk kompatibilitas ke belakang (*backward compatibility*).
*   **Tujuan:** Mengganti sistem divisi vendor statis yang terbatas menjadi sistem PIC dinamis yang dikustomisasi oleh EO dan mendukung multi-PIC di setiap sesi acara.

### 2. 📱 Antarmuka Pengelolaan PIC & Pilihan Badge Sesi Rundown
*   **Perubahan:**
    *   **Komponen UI PicManagement:** Membuat komponen [PicManagement.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/rooms/[id]/_components/PicManagement.tsx) yang diletakkan pada tab "Akses" di dashboard EO untuk menambah dan menghapus PIC.
    *   **Form Sesi Rundown Checklist:** Memperbarui [AddRundownForm.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/rooms/[id]/_components/AddRundownForm.tsx) dengan pilihan multi-select berbasis checkbox badge untuk menugaskan satu atau beberapa PIC ke sesi rundown.
    *   **Tabel Rundown Multi-Badge:** Memperbarui [RundownTable.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/rooms/[id]/_components/RundownTable.tsx) untuk merender daftar badge PIC yang ditugaskan di setiap baris rundown dengan parser fallback jika data lama kosong.
    *   **Pewarnaan Badge Dinamis (Colorful Badges):** Membuat berkas utility [picColors.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/lib/picColors.ts) untuk mengelola pewarnaan badge PIC secara terpusat. Mendukung warna coklat khusus untuk "Pihak KUA", biru untuk "Pria", pink untuk "Wanita", teal untuk "Keluarga", serta algoritma hashing deterministik untuk menghasilkan warna unik yang berbeda-beda bagi PIC kustom lainnya. Variasi warna ini diterapkan konsisten di form checklist input, tabel rundown, log prompter, dan status screen vendor.
*   **Tujuan:** Memberikan kemudahan bagi EO untuk menyusun penanggung jawab sesi secara intuitif dengan antarmuka yang bersih, interaktif, dan penuh warna yang kontras.

### 3. 📢 Pocket Prompter Dinamis & Layar Bersama Layanan Lapangan (Shared Prompter Screen)
*   **Perubahan:**
    *   **Dropdown Penerima Dinamis:** Memperbarui dropdown divisi penerima pada prompter [ControlPanel.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/rooms/[id]/_components/ControlPanel.tsx) agar memuat daftar PIC dinamis dari database, memotong pilihan divisi hardcoded yang lama.
    *   **Refaktorisasi Layar Vendor Bersama (Shared View):** Memodifikasi [VendorView.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/v/[token]/_components/VendorView.tsx) untuk menghilangkan filter divisi (menampilkan seluruh pesan prompter) karena menggunakan satu link akses bersama.
    *   **Format Prefix Instruksi:** Menambahkan format prefix visual `[to NamaPIC] : pesan` pada tampilan instruksi terakhir, popup alerts instan raksasa (overlay 7 detik), Document PiP, dan Canvas Fallback PiP agar kru lapangan dapat dengan cepat mengidentifikasi target penerima pesan tersebut.
*   **Tujuan:** Menyederhanakan pembagian tautan akses (cukup satu link untuk seluruh kru) dan memperjelas pembagian instruksi visual langsung di layar bersama kru.

---

## 📅 Pembaruan: 15 Juni 2026

### 0. ⚡ Integrasi Upstash Redis (Penggantian In-Memory Mock)
*   **Perubahan:**
    *   Memasang paket `@upstash/redis` (SDK resmi Upstash berbasis HTTP/REST) sebagai dependency baru.
    *   Merefaktorisasi [redis.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/lib/redis.ts) dengan logika dual-mode:
        *   **Mode Produksi (Upstash):** Jika variabel lingkungan `REDIS_URL` dan `REDIS_TOKEN` di `.env` terisi dengan nilai valid (bukan placeholder), sistem secara otomatis menginisialisasi klien `@upstash/redis` dan menggunakan perintah `get`, `set`, serta `publish`/`subscribe` Upstash untuk sinkronisasi data real-time lintas instans server.
        *   **Mode Fallback (In-Memory):** Jika variabel lingkungan tidak dikonfigurasi atau masih berisi teks placeholder, sistem otomatis beralih ke implementasi *mock* berbasis `Map` in-process tanpa memerlukan konfigurasi apapun dari developer lokal.
    *   Menambahkan `upstashClient.publish(roomId, value)` setiap kali `redis.set()` dipanggil untuk meneruskan sinyal pembaruan ke seluruh SSE subscriber.
    *   Menggunakan `.unsubscribe()` pada objek *subscriber* Upstash di dalam cleanup callback `request.signal` untuk mencegah kebocoran koneksi saat klien memutus sambungan.
    *   **Koreksi nama variabel `.env`:** Memperbaiki ketidakcocokan nama variabel lingkungan antara konvensi Upstash dashboard (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) dengan nama yang dibaca kode (`REDIS_URL` / `REDIS_TOKEN`). Pemeriksaan placeholder otomatis di `isPlaceholder()` memastikan koneksi hanya diinisialisasi dengan token asli.
    *   **Pembaruan [README.md](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/README.md):** Memperbaiki entri Tech Stack (SQLite → PostgreSQL/Supabase), menambahkan penjelasan dual-mode Redis, dan menambahkan panduan setup Upstash Redis opsional pada seksi *Cara Menjalankan Proyek*.
*   **Tujuan:** Memungkinkan sinkronisasi status timer dan prompter secara real-time lintas instans server di lingkungan produksi (multi-instance/serverless), serta menjamin keandalan SSE broadcast ke semua klien yang terhubung dari manapun — tanpa mengorbankan kemudahan developer lokal yang tidak ingin mengkonfigurasi Redis.

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

### 13. ⏱️ Fitur Transisi Otomatis Sesi Rundown Selesai (Automated Rundown Session Auto-Advance)
*   **Perubahan:**
    *   **Server Actions Validation:** Menambahkan parameter `isAutoAdvance` pada Server Action `updateTimerStatusAction` di [roomControl.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/actions/roomControl.ts) untuk memvalidasi bahwa transisi otomatis hanya berjalan jika room belum berpindah ke target index yang baru dan index saat ini adalah index yang tepat sebelumnya. Ini mencegah tab atau admin ganda memicu transisi duplikat secara beruntun.
    *   **Locks di Klien (Control Panel):** Menambahkan reference lock `isTransitioningRef` pada [ControlPanel.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/rooms/[id]/_components/ControlPanel.tsx) yang memblokir trigger ganda dari pemanggilan tick lokal sebelum database berhasil diupdate dan dibroadcast ulang ke React state.
    *   **Auto-Advance Trigger:** Mengintegrasikan logika transisi otomatis di dalam `tick` callback: jika timer sedang berjalan dan waktu tersisa habis (`diff <= 0`), sistem secara otomatis memindahkan ke rundown berikutnya atau menghentikan timer (`stopped`) jika itu adalah sesi terakhir.
*   **Tujuan:** Menghadirkan transisi otomatis yang seamless antar sesi rundown saat waktu berakhir, mengurangi beban intervensi manual oleh Show Caller di hari-H acara.

### 14. 🎨 Warna Indikator Sisa Waktu Timer (Dynamic Timer Warning Text Colors)
*   **Perubahan:**
    *   **State Pelacak Sisa Waktu:** Menambahkan state `remainingSeconds` pada [ControlPanel.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/rooms/[id]/_components/ControlPanel.tsx) dan [VendorView.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/v/[token]/_components/VendorView.tsx) untuk menangkap sisa waktu panggung secara dinamis setiap detak timer.
    *   **Modifikasi Warna Main UI:** Mengubah warna teks digit timer pada dasbor EO dan Vendor View agar berubah warna secara dinamis:
        *   Sisa waktu $> 5$ menit: Warna normal (`text-indigo-400` saat berjalan, `text-slate-400` saat dijeda/berhenti).
        *   Sisa waktu $\le 5$ menit: Warna kuning/oranye (`text-amber-500`).
        *   Sisa waktu $\le 1$ menit: Warna merah berkedip lambat (`text-red-500 animate-pulse-slow`).
        *   Overtime/Habis waktu: Warna merah menyala (`text-rose-500` di EO, `text-white` dengan background merah berdenyut di Vendor).
    *   **Pembaruan Jendela Melayang (PiP):** Menyinkronkan perubahan warna ini pada Document PiP (`timerEl.className`) dan Canvas Fallback PiP (`ctx.fillStyle`) agar kru tetap mendapatkan isyarat visual yang sama saat menggunakan mode melayang.
*   **Tujuan:** Memberikan isyarat visual yang instan dan intuitif bagi Show Caller dan vendor lapangan saat durasi sesi rundown mulai memasuki masa-masa kritis.

### 15. 🛡️ Jendela Konfirmasi Aksi Kontrol Kritis (Critical Control Action Confirmation Dialogs)
*   **Perubahan:**
    *   **Konfirmasi Menghentikan Timer:** Menambahkan dialog konfirmasi Ya/Tidak pada aksi `handleStop` di [ControlPanel.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/rooms/[id]/_components/ControlPanel.tsx) sebelum mematikan timer, guna mencegah tidak sengaja mereset sesi aktif kembali ke indeks `-1`.
    *   **Konfirmasi Lompat Sesi:** Menambahkan dialog konfirmasi pada aksi `handleSelectSession` jika EO mengeklik baris rundown atau menekan tombol skip untuk melompat/memulai ulang sesi lain saat ada sesi yang sedang aktif.
*   **Tujuan:** Melindungi jalannya acara dari ketidaksengajaan klik (*misclicks*) oleh Show Caller saat mengoperasikan dasbor panggung dari perangkat mobile.

### 16. 📊 Pemisahan Waktu Asli dan Waktu Offset untuk Analitik (Analytical Offset & Original Duration Separation)
*   **Perubahan:**
    *   **Kolom Skema Database:** Menambahkan kolom `appliedOffsetSeconds` pada tabel `rundownItems` di [schema.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/db/schema.ts) untuk menyimpan riwayat akumulasi offset secara terpisah untuk setiap sesi.
    *   **Perekaman Offset Aktif:** Memperbarui Server Action `adjustRoomOffsetAction` di [roomControl.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/actions/roomControl.ts) agar ikut mengakumulasikan nilai detik offset ke kolom `appliedOffsetSeconds` sesi yang sedang aktif saat itu.
    *   **Reset Transisi Sesi:** Memperbarui Server Action `updateTimerStatusAction` di [roomControl.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/actions/roomControl.ts) agar otomatis mereset `appliedOffsetSeconds` target sesi kembali ke `0` saat dimasuki/dimulai ulang, serta mereset `rooms.currentOffsetSeconds` kembali ke `0`.
*   **Tujuan:** Memisahkan waktu asli rundown dengan waktu offset secara terstruktur untuk analitik keterlambatan (*post-event evaluation*), sekaligus memastikan perpindahan atau lompatan sesi selalu dimulai dengan durasi orisinil (tanpa mewarisi offset sesi sebelumnya).

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

### 2. 🔍 Audit UI & Perbaikan Ketentuan Desain (UI Audit & Design Guidelines Compliance)
*   **Perubahan:**
    *   **Standarisasi Tipografi:** Mengganti manual triple dots (`...`) dengan karakter unicode elipsis tunggal (`…`) pada pemuatan fallback tabs di [page.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/rooms/[id]/page.tsx) dan inisialisasi gambar kanvas PiP di [ControlPanel.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/rooms/[id]/_components/ControlPanel.tsx) serta [VendorView.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/v/[token]/_components/VendorView.tsx).
    *   **Optimalisasi Transisi:** Mengubah kelas `transition-all` yang terlalu luas menjadi transisi properti spesifik yang ramah terhadap compositor browser (seperti `transition-[border-color,background-color]`, `transition-colors`, dan `transition-[transform,background-color,border-color]`) pada tombol CTA di [page.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/page.tsx), kartu event di [RoomList.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/_components/RoomList.tsx), dan tombol tema di [ThemeToggle.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/_components/ThemeToggle.tsx).
*   **Tujuan:** Memastikan kepatuhan penuh terhadap Vercel Web Interface Guidelines guna mencegah CLS (Cumulative Layout Shift) dan menjamin performa render yang efisien.

### 3. ✍️ Perbaikan UX Copy Landing Page (Toss-Inspired UX Copy)
*   **Perubahan:**
    *   **Penyelarasan Nada Bicara:** Memperbaiki teks hero, CTA, dan grid fitur pada [page.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/page.tsx) agar lebih kasual, sopan, bernada aktif, dan langsung pada sasaran (*Toss-style microcopy*).
    *   **Penyederhanaan Istilah:** Mengurangi istilah jargon teknis (*jargon-free*) seperti "Real-Time D-Day Event Coordinator" menjadi "⏱️ Asisten Koordinasi Rundown Hari-H", dan "offline-ready" menjadi "tetap lancar meski susah sinyal".
    *   **Kejelasan Aksi (CTA):** Mengubah teks tombol primer menjadi "Masuk ke Dasbor" dan tombol sekunder menjadi "Mulai Gratis".
*   **Tujuan:** Membantu pengguna baru memahami nilai dan manfaat aplikasi dengan lebih cepat serta meningkatkan konversi pendaftaran.

### 4. 🖼️ Sinkronisasi Tema pada Mode Picture-in-Picture (PiP Theme Synchronization)
*   **Perubahan:**
    *   **Document PiP Theme Sync:** Menambahkan penyalinan kelas `.dark` dari dokumen induk (`document.documentElement`) ke dokumen jendela PiP baru (`pipWindow.document.documentElement`) pada [ControlPanel.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/rooms/[id]/_components/ControlPanel.tsx) dan [VendorView.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/v/[token]/_components/VendorView.tsx).
    *   **Canvas PiP Dynamic Styling:** Mengganti warna Hex statis di dalam loop gambar kanvas (`draw()`) menjadi warna dinamis yang membaca kelas `.dark` dari dokumen induk, memastikan tampilan kanvas PiP menyesuaikan palet warna mode terang atau mode gelap secara tepat.
*   **Tujuan:** Menjamin konsistensi visual di seluruh mode PiP (baik HTML melayang maupun video kanvas) agar serasi dengan skema warna yang diatur pengguna di dasbor utama.

### 5. ♿ Pembenahan Kontras Teks PiP Mode Terang (PiP Light Mode Contrast Fix)
*   **Perubahan:**
    *   **Penyelesaian Masalah Keterbacaan:** Mengubah warna teks `text-white` (warna putih statis) pada elemen peringatan pesan baru (`#pip-alert-text`) dan `text-indigo-300` pada elemen pesan prompter (`#pip-message`) di dalam template Document PiP menjadi kelas dinamis `text-slate-50` (yang memetakan ke `--text-1` / teks gelap di mode terang) dan `text-indigo-600` (yang memetakan ke `--brand-base`).
    *   **Penyesuaian Label:** Mengubah warna label `"PESAN BARU!"` dari `text-amber-400` yang buram di latar terang menjadi `text-rose-500` (danger red) yang sangat kontras dan aman untuk dibaca pada mode terang maupun gelap.
### 6. ⚡ Migrasi Sistem Real-Time ke Supabase Realtime (Supabase Realtime Migration)
*   **Perubahan:**
    *   **Pemasangan Library:** Menambahkan `@supabase/supabase-js` sebagai pustaka utama koneksi client-side.
    *   **Inisialisasi Client:** Membuat berkas konfigurasi [supabaseClient.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/lib/supabaseClient.ts) untuk mengelola langganan WebSocket di sisi klien.
    *   **Penggantian SSE:** Mengganti penanganan `EventSource` (SSE) pada [ControlPanel.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/rooms/[id]/_components/ControlPanel.tsx) dan [VendorView.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/v/[token]/_components/VendorView.tsx) dengan WebSocket subscription Supabase Realtime.
    *   **Penyelarasan Skema (CamelCase Mapping):** Mengimplementasikan fungsi mapper (`mapRoom`, `mapMessage`, `mapLog`) untuk mengonversi payload *snake_case* PostgreSQL menjadi objek *camelCase* agar kompatibel dengan model UI.
    *   **Ketahanan Offline (Dexie Sync):** Mengintegrasikan update real-time di sisi vendor dengan penyimpanan IndexedDB (Dexie) secara instan guna memastikan fallback luring tetap sinkron.
*   **Tujuan:** Mengeliminasi latensi geografi serverless, memotong total kueri database (dari puluhan query per klik menjadi 0-1 query saja), dan menghilangkan ketergantungan SSE jangka pendek yang tidak cocok untuk serverless.

### 7. 📲 Integrasi PWA & Push Notification via Serwist (PWA & Web Push Notification Integration)
*   **Perubahan:**
    *   **Transisi Library PWA:** Mengganti `@ducanh2912/next-pwa` dengan `@serwist/next` dan `@serwist/turbopack` guna memastikan kompatibilitas 100% dengan Turbopack compiler (`next dev --turbo`).
    *   **Kompilasi Statis Service Worker:** Membuat static route compiler di [route.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/serwist/[path]/route.ts) dan rewrites/headers di `next.config.ts` untuk memicu kompilasi esbuild Service Worker saat build time, guna membebaskan aplikasi dari crash perizinan baca-saja (*read-only failure*) di Vercel.
    *   **Service Worker Custom (`sw.ts`):** Mengimplementasikan penanganan event `push` dan `notificationclick` pada [sw.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/sw.ts) untuk memicu notifikasi visual dan pola getaran smartwatch.
    *   **Tabel Database & Token:** Menambahkan skema tabel `push_subscriptions` di [schema.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/db/schema.ts) untuk menyimpan token notifikasi berdasarkan `roomId` dan `role` vendor secara login-free.
    *   **Server Actions & Dispatcher:**
        *   Membuat berkas Server Action pendaftaran token di [pushSubscribe.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/actions/pushSubscribe.ts).
        *   Membuat helper pengiriman notifikasi [pushSender.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/lib/pushSender.ts) menggunakan pustaka `web-push`.
        *   Mengintegrasikan trigger pengiriman notifikasi di `sendPrompterMessageAction` agar pesan prompter langsung memicu push notif ke HP/smartwatch vendor penerima secara real-time.
    *   **UI Lonceng & Banner Prompt:** Menambahkan Bell Icon (Opsi 1) dan Banner Prompt interaktif (Opsi 2) di [VendorView.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/v/[token]/_components/VendorView.tsx) agar kru dapat dengan mudah menyalakan/mematikan notifikasi.
*   **Tujuan:** Memperluas jangkauan notifikasi real-time panggung langsung ke HP dan smartwatch pergelangan tangan kru di lapangan secara andal tanpa memakan daya HP yang besar.

### 8. 🔑 Konfigurasi Kunci VAPID & Penyempurnaan Dokumentasi (VAPID Keys Configuration & Documentation Update)
*   **Perubahan:**
    *   **Penyediaan Kunci VAPID:** Men-generate pasangan kunci VAPID publik dan privat baru untuk protokol Web Push.
    *   **Pembaruan Berkas Env:** Mendaftarkan variabel `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, dan `VAPID_PRIVATE_KEY` ke berkas konfigurasi lokal `.env` dan menyelaraskannya ke `.env.example`.
    *   **Pembaruan Panduan Setup:** Memperbarui [README.md](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/README.md) dengan panduan pembuatan kunci VAPID serta instruksi pembuatan manual tabel `push_subscriptions` di dasbor Supabase SQL Editor apabila terhambat port pooler Drizzle.
*   **Tujuan:** Menjamin keutuhan instruksi instalasi dan mempermudah pengembang lain untuk mengonfigurasi fitur push notification secara mandiri di lingkungan lokal maupun produksi.

### 9. 🛡️ Penanganan Error Tangguh pada Jendela Picture-in-Picture (Robust DOM Exception Handling in Document PiP)
*   **Perubahan:** Membungkus seluruh logika manipulasi DOM Document PiP di dalam ticker interval `tick()` menggunakan blok `try/catch` pada [VendorView.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/v/[token]/_components/VendorView.tsx).
*   **Tujuan:** Mencegah terjadinya *unhandled DOM Exception* atau *TypeError* ketika jendela PiP ditutup secara eksternal oleh OS/browser atau saat terjadi update state offset asinkron dari EO, sehingga menghindari error boundary Next.js ("*This page needs to be reloaded*").

### 10. 🍎 Kompatibilitas Picture-in-Picture pada iOS Safari iPhone (Safari iOS PiP Compatibility API)
*   **Perubahan:**
    *   **Adaptasi API:** Mengintegrasikan deteksi dan pemanggilan API webkit non-standar (`webkitSupportsPresentationMode` dan `webkitSetPresentationMode`) untuk menjalankan Canvas Fallback PiP di iOS Safari (iPhone).
    *   **Daur Hidup Event:** Menambahkan event listener `webkitpresentationmodechanged` untuk memicu pembersihan DOM video secara otomatis saat user menutup PiP secara manual di iPhone.
    *   **Optimasi Pemuatan Video:** Menghilangkan asinkronisasi `onloadedmetadata` yang lambat/tidak andal di Safari iOS, lalu memicu play stream secara sinkron dengan jeda mikro `requestAnimationFrame` sebelum mengaktifkan PiP.
*   **Tujuan:** Memastikan kru/vendor lapangan yang menggunakan perangkat iPhone/iOS tetap dapat memanfaatkan fitur jendela melayang PiP secara andal di bawah peramban Safari.

### 11. ⏱️ Peringatan Auto Push Notifikasi Sisa Waktu Rundown (Automated Time-Remaining Push Notification Alerts)
*   **Perubahan:**
    *   **Otomatisasi Ticker:** Mengintegrasikan pemicu sisa waktu di `ControlPanel.tsx` untuk memicu push alert ketika rundown aktif tersisa kurang dari 5 menit dan kurang dari 1 menit.
    *   **Server Action & Redis Lock:** Membuat Server Action `sendTimeAlertNotificationAction` di [roomControl.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/actions/roomControl.ts) untuk mengirim push notification ke divisi penanggung jawab, lengkap dengan deduplikasi ganda (pelacakan client-side `sentAlertsRef` dan server-side Redis lock dengan TTL 2 jam).
    *   **Ekspansi Driver Redis:** Menyempurnakan method `set` pada helper [redis.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/lib/redis.ts) agar mendukung opsi TTL `{ ex: seconds }` bawaan Upstash Redis.
*   **Tujuan:** Mempermudah kesiapan kru di belakang panggung dengan mengirim notifikasi push langsung ke HP/smartwatch mereka saat waktu rundown sesi aktif akan segera habis.

### 12. 🐛 Perbaikan Bug Delay Notifikasi Push (Serverless Event Loop Freeze Fix)
*   **Perubahan:**
    *   **Awaiting Push Dispatch:** Menambahkan kata kunci `await` sebelum pemanggilan `sendPushNotification()` pada Server Actions `sendPrompterMessageAction` dan `sendTimeAlertNotificationAction` di [roomControl.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/actions/roomControl.ts).
*   **Tujuan:** Menghentikan bug "delay satu pesan" pada push notification. Sebelumnya, fungsi asinkron dijalankan secara *fire-and-forget* tanpa `await` yang menyebabkan *event loop* Node.js dibekukan (*frozen*) seketika oleh lingkungan serverless setelah respons HTTP dikirim, dan baru mencair serta mengirimkan notifikasi tertunda saat ada request baru masuk.

---


## 🛠️ Status Kompilasi Proyek
*   **Uji Coba Build:** Berhasil dijalankan via `npm run build` pada 15 Juni 2026.
*   **Hasil:** Kompilasi sukses 100% menggunakan Next.js dengan status **Zero Errors** pada page bundle optimization.


