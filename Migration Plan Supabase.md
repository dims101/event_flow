# Blueprint Migrasi: SQLite ke Supabase (PostgreSQL)

Dokumen ini memecah seluruh rangkaian tugas untuk memindahkan basis data EventFlow dari SQLite lokal ke Supabase PostgreSQL secara aman, andal, dan sesuai dengan standar keamanan (*best practices*).

---

## 📐 Pendekatan (Approach)
Migrasi dilakukan dengan mengganti driver Drizzle dari `better-sqlite3` ke `postgres-js`, menyesuaikan skema tabel ke tipe data PostgreSQL, serta mengonfigurasi koneksi menggunakan **Connection Pooling Supavisor (Port 6543, Mode Transaksi, SSL Aktif)**. Langkah mitigasi celah keamanan (*RLS Bypass*) dilakukan dengan memperketat otorisasi tingkat aplikasi pada Server Actions dan menyiapkan kebijakan *Row Level Security* (RLS) di dasbor Supabase.

---

## 🔍 Cakupan (Scope)

*   **Masuk Cakupan (In-Scope):**
    *   Instalasi dependensi driver PostgreSQL (`postgres`).
    *   Konfigurasi ulang file konfigurasi Drizzle (`drizzle.config.ts`).
    *   Konversi tipe data SQLite ke PostgreSQL di berkas `src/db/schema.ts`.
    *   Inisialisasi koneksi database pooling di `src/db/index.ts` dengan penanganan *prepared statements* khusus pooler.
    *   Audit keamanan otorisasi Server Actions (`src/app/actions/*`) terhadap celah IDOR.
    *   Pembuatan skrip kebijakan RLS untuk Supabase.
*   **Luar Cakupan (Out-of-Scope):**
    *   Pembuatan proyek/akun Supabase baru (dilakukan manual oleh pengguna).
    *   Migrasi data lama dari SQLite ke PostgreSQL (proyek dimulai dengan database kosong baru).

---

## 📋 Daftar Tugas Tindakan (Action Items)

### Tahap 1: Setup Dependensi & Konfigurasi Drizzle
*   [ ] **1.1. Instal Driver PostgreSQL:** Jalankan `npm install postgres` (atau `npm install pg @types/pg` jika memilih driver pg).
*   [ ] **1.2. Perbarui drizzle.config.ts:** Ubah objek konfigurasi untuk menggunakan dialek `postgresql` dan ambil koneksi dari `process.env.DATABASE_URL`.
    ```typescript
    import { defineConfig } from 'drizzle-kit';
    export default defineConfig({
      dialect: 'postgresql',
      schema: './src/db/schema.ts',
      out: './drizzle',
      dbCredentials: {
        url: process.env.DATABASE_URL!,
      },
    });
    ```

### Tahap 2: Konversi Skema Database (`src/db/schema.ts`)
*   [ ] **2.1. Ubah Core core-imports:** Ganti import dari `drizzle-orm/sqlite-core` ke `drizzle-orm/pg-core` (menggunakan `pgTable`, `text`, `integer`, `timestamp`, `uuid`, dll.).
*   [ ] **2.2. Konversi Definisi Kolom:**
    *   Ubah semua kolom ID bertipe `text` menjadi `uuid` atau `text` (jika menggunakan UUID string dari server).
    *   Ubah kolom waktu integer (seperti `createdAt`, `timerStartTime`) menjadi `timestamp` atau tetap `integer` (jika menggunakan epoch Unix timestamp).
    *   Sesuaikan sintaks foreign key references ke format pg-core.
    ```typescript
    import { pgTable, text, integer, uuid, timestamp } from 'drizzle-orm/pg-core';
    // Contoh konversi tabel users
    export const users = pgTable('users', {
      id: text('id').primaryKey(), // atau uuid('id')
      email: text('email').notNull().unique(),
      passwordHash: text('password_hash').notNull(),
      companyName: text('company_name').notNull(),
    });
    ```

### Tahap 3: Pembaruan Inisialisasi Klien Database (`src/db/index.ts`)
*   [ ] **3.1. Hubungkan Klien via Supavisor (Port 6543):** Ubah file inisialisasi Drizzle untuk menggunakan driver `postgres-js` dengan opsi `prepare: false` guna kompatibilitas mode transaksi pooler.
    ```typescript
    import { drizzle } from 'drizzle-orm/postgres-js';
    import postgres from 'postgres';
    import * as schema from './schema';

    // Gunakan connection string supavisor port 6543 dengan ?sslmode=require
    const connectionString = process.env.DATABASE_URL!;
    const client = postgres(connectionString, { prepare: false });
    
    export const db = drizzle(client, { schema });
    export type DbClient = typeof db;
    ```

### Tahap 4: Push Skema & Setup Dasbor Supabase
*   [ ] **4.1. Setup Variabel Lingkungan:** Perbarui file `.env` lokal Anda dengan menambahkan parameter `DATABASE_URL` yang mengarah ke Supavisor (Port 6543) Supabase Anda.
*   [ ] **4.2. Eksekusi Drizzle Push:** Jalankan `npx drizzle-kit push` untuk membuat tabel-tabel baru langsung di database PostgreSQL Supabase Anda.
*   [ ] **4.3. Buat RLS Policies di Supabase (Defense-in-Depth):** Jalankan query SQL di SQL Editor Supabase untuk mengaktifkan RLS pada tabel-tabel utama (seperti `rooms`, `rundown_items`) dan buat kebijakan dasar (misal: hanya pengguna terautentikasi dengan ID yang sama yang dapat membaca/menulis).

### Tahap 5: Audit & Pengamanan Server Actions (Proteksi IDOR)
*   [ ] **5.1. Audit Otorisasi Sesi:** Periksa setiap berkas Server Actions di `src/app/actions/`. Pastikan tidak ada kueri mutasi data (`update`, `delete`, `insert`) yang hanya menerima parameter dari client tanpa mencocokkan `userId` dari cookie sesi terenkripsi yang valid.
    *   File terpengaruh: `auth.ts`, `room.ts`, `roomControl.ts`, `rundown.ts`.
*   [ ] **5.2. Enforce Filter `userId`:** Pastikan kueri Drizzle selalu memfilter berdasarkan `userId` pengguna yang sedang aktif, misalnya:
    ```typescript
    // Pastikan memverifikasi userId
    await db.update(rooms)
      .set({ timerStatus: 'running' })
      .where(and(eq(rooms.id, roomId), eq(rooms.userId, sessionUserId)));
    ```

---

## 🧪 Validasi & Pengujian

*   [ ] **Uji Coba Autentikasi:** Daftarkan akun EO baru dan masuk log. Pastikan sesi tersimpan di cookie HTTP-only dengan aman.
*   [ ] **Uji Coba CRUD Event:** Buat ruangan acara baru, tambahkan rundown item, dan hapus item. Periksa apakah data terdistribusi ke Supabase secara real-time.
*   [ ] **Uji Coba Vendor Tautan:** Salin tautan vendor dan buka di browser seluler/mode penyamaran tanpa login. Uji apakah halaman `/v/[token]` dapat memuat rundown dengan tepat.
*   [ ] **Verifikasi Log Aktivitas:** Pastikan log aktivitas tersimpan di tabel `activity_logs` Supabase dan sinkronisasi real-time via SSE tetap berjalan.
