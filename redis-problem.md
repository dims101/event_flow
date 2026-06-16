# Redis Problem Analysis — EventFlow

> Dokumen ini mencatat hasil audit penggunaan Redis di aplikasi EventFlow,
> termasuk masalah yang ditemukan dan rekomendasi solusi.

---

## Temuan: 4 Problem Kebocoran Redis

### Problem 1 — Double Write Per Klik Tombol (Boros Command)

**Lokasi:** `src/lib/redis.ts` baris 50–56

```typescript
await upstashClient.set(key, value);        // Command 1: SET
await upstashClient.publish(roomId, value); // Command 2: PUBLISH
```

Setiap klik tombol (start timer, adjust offset, kirim pesan) membuat **2 HTTP
request ke Upstash** — satu untuk menyimpan nilai, satu untuk notifikasi
subscriber. Ini terjadi juga di background via `logActivityBackground()` tanpa
terasa.

**Dampak:** Upstash free tier limit **10.000 command/hari**. Dengan aktivitas
normal EO saja quota bisa habis lebih cepat dari yang diperkirakan.

---

### Problem 2 — Tidak Ada TTL, Keys Menumpuk Selamanya (Storage Leak)

**Lokasi:** `src/lib/serverUtils.ts` baris 29

```typescript
redis.set(`room:${roomId}`, Date.now().toString())
```

Key seperti `room:abc123` tidak pernah di-set expiry (`EX` / `TTL`). Room yang
sudah dihapus dari database tetap hidup di Redis selamanya karena tidak ada
mekanisme pembersihan.

**Dampak:** Storage Redis terus membengkak. Upstash free tier limit **256MB**.
Untuk aplikasi yang dipakai berulang kali dengan banyak event, ini akan penuh
perlahan.

---

### Problem 3 — Cascade DB Queries per SSE Notification 🚨 (Paling Kritis)

**Lokasi:** `src/app/api/rooms/[id]/stream/route.ts` baris 29–63 dan 69–71

```typescript
// Setiap Redis PUBLISH diterima, SSE langsung jalankan ini:
const unsubscribe = redis.subscribe(roomId, async () => {
  await fetchAndSendState(); // ← 4 DB queries setiap dipanggil!
});

const fetchAndSendState = async () => {
  const room     = await db.query.rooms.findFirst(...)        // DB query 1
  const items    = await db.query.rundownItems.findMany(...)  // DB query 2
  const messages = await db.query.prompterMessages.findMany() // DB query 3
  const logs     = await db.query.activityLogs.findMany(...)  // DB query 4
};
```

Alur satu klik tombol timer dengan 5 device terhubung:

```
EO klik "Start Timer"
  → Server Action: 1-2 DB writes
  → logActivityBackground: redis.set() → PUBLISH ke Upstash
      → Diterima oleh SEMUA SSE subscriber (semua device yang buka halaman)
          → Setiap device: fetchAndSendState() = 4 DB queries

5 device terhubung (EO + 4 vendor) = 5 × 4 = 20 DB queries per satu klik
```

**Dampak:**
- Makin banyak vendor membuka halaman `/v/[token]`, makin berat setiap klik
- Setiap klik di EO memicu puluhan query ke Supabase secara bersamaan
- Ini bisa menyebabkan throttling dari Supabase dan memperlambat seluruh aplikasi
- Sepenuhnya tidak scalable

---

### Problem 4 — `subscribe()` Tidak Cocok untuk Serverless (Connection Leak)

**Lokasi:** `src/lib/redis.ts` baris 79–87 dan `stream/route.ts`

`@upstash/redis` adalah **HTTP/REST client** — tidak mendukung persistent TCP
connection yang dibutuhkan untuk pub/sub sesungguhnya. Fungsi `subscribe()`
menggunakan HTTP long-polling di balik layar.

Di serverless (Netlify/Vercel), setiap function invocation ada **timeout limit**:
- Netlify: 26 detik
- Vercel: 10 detik (default)

Setelah timeout:
1. SSE stream mati dari sisi server
2. Client otomatis reconnect (ada di browser EventSource API)
3. Subscriber baru dibuat di server
4. Jika `abort signal` tidak terpanggil dengan benar saat function di-kill → **subscriber lama tidak dihapus dari Upstash**

**Dampak:** Subscriber zombie menumpuk di Upstash. Setiap PUBLISH dikirim ke
subscriber yang sudah tidak aktif, membuang command quota.

---

## Kesimpulan Arsitektur Saat Ini

```
EO klik → DB write → redis.set() → SET + PUBLISH (2 commands)
                                         ↓
                               SSE subscriber menerima
                                         ↓
                          fetchAndSendState() → 4 DB queries lagi
                                         ↓
                               Kirim ke client
```

| Komponen | Masalah |
|----------|---------|
| Redis `set()` | 2 command per aksi (boros) |
| Redis keys | Tidak ada TTL (storage leak) |
| SSE `subscribe()` | Cascade 4 DB queries × jumlah device |
| Serverless + pub/sub | Subscriber bocor saat timeout |

---

## Rekomendasi: Ganti dengan Supabase Realtime

### Arsitektur Baru

```
EO klik → DB write
              ↓
    Supabase deteksi perubahan otomatis (PostgreSQL logical replication)
              ↓
    Kirim payload langsung ke semua client via WebSocket
    (data sudah include, tidak perlu fetch lagi)
```

### Perbandingan

| Aspek | SSE + Redis (Sekarang) | Supabase Realtime |
|-------|------------------------|-------------------|
| **Redis** | Wajib ada | ✅ Tidak perlu sama sekali |
| **Cascade DB queries** | N device × 4 queries per klik | ✅ Nol — payload dikirim langsung |
| **Koneksi** | HTTP SSE (timeout di serverless) | ✅ WebSocket persistent di browser |
| **Kompleksitas kode** | SSE route + redis.ts + subscribe | ✅ ~10 baris di client component |
| **Upstash command quota** | Habis cepat | ✅ Tidak pakai sama sekali |
| **Scalability** | Memburuk seiring jumlah device | ✅ Flat — tidak bertambah berat |

### Cara Kerja Supabase Realtime

WebSocket berjalan di **browser client**, bukan di server — tidak ada serverless
timeout, tidak ada cascade DB queries.

```typescript
// Di client component vendor/EO
const supabase = createClient(url, anonKey);

supabase
  .channel(`room:${roomId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'rooms',
    filter: `id=eq.${roomId}`
  }, (payload) => {
    setRoom(payload.new); // ← data langsung ada, no DB query lagi
  })
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'prompter_messages',
    filter: `room_id=eq.${roomId}`
  }, (payload) => {
    setMessages(prev => [payload.new, ...prev]);
  })
  .subscribe();
```

### Yang Perlu Dilakukan untuk Migrasi

1. **Supabase Dashboard:** Enable Replication untuk tabel `rooms`,
   `rundown_items`, `prompter_messages`, `activity_logs`
2. **Install packages:** `@supabase/supabase-js` dan `@supabase/ssr`
3. **Environment variables:** Tambah `NEXT_PUBLIC_SUPABASE_URL` dan
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` di `.env`
4. **Refactor:** `ControlPanel.tsx` dan halaman vendor `/v/[token]` pakai
   Supabase Realtime subscription
5. **Hapus:** `src/app/api/rooms/[id]/stream/route.ts` — tidak diperlukan lagi
6. **Hapus:** `src/lib/redis.ts` dan dependency `@upstash/redis` (opsional,
   atau tetap untuk caching saja)
7. **Hapus:** `logActivityBackground` tidak perlu PUBLISH ke Redis lagi —
   cukup DB write, Supabase Realtime otomatis broadcast

### Catatan Keamanan

Supabase Realtime menggunakan **anon key** yang terekspos di browser (public).
Ini aman selama:
- Data yang di-broadcast tidak sensitif (timer, offset, pesan prompter — ✅ fine)
- Atau Row Level Security (RLS) dikonfigurasi untuk membatasi akses per token

Untuk EventFlow yang berbasis token vendor, ini sudah cukup aman.
