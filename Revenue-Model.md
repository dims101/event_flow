# Rancangan Model Pendapatan (Revenue Model) EventFlow

Platform ini dirancang untuk melakukan penetrasi pasar Event Organizer di Indonesia menggunakan model SaaS **Hibrida: Freemium + Langganan Berjenjang + Sistem Kredit**.

## 1. Ringkasan Pemahaman & Target Pasar
* **Target Pasar Utama:** Wedding Organizer (UKM) dengan anggaran ketat dan acara musiman, hingga Corporate EO/Promotor berskala besar.
* **Tujuan Model Bisnis:** Menurunkan hambatan masuk menjadi nol untuk pengguna baru (via *Freemium*), dan mengamankan kas berkelanjutan (*Recurring Revenue*) dari pengguna tetap (via Langganan). 
* **Metode Pembayaran:** Berpusat pada mikrotraksaksi lokal seperti QRIS, Virtual Account (VA), dan e-Wallet untuk meminimalisasi gesekan pembayaran.

## 2. Struktur Tingkatan Harga (Pricing Tiers) & Fitur

Sistem berpusat pada "Kredit Acara". 1 Kredit = 1 Acara (Room) yang dapat di-*unlock* (beroperasi penuh).

### A. Paket Free (Starter)
* **Harga:** Rp 0
* **Kredit:** Mendapat jatah **1 Kredit Acara dasar** setiap bulan.
* **Aturan Kedaluwarsa:** **Tidak bisa diakumulasi (No Rollover)**. Jika di akhir bulan kredit masih 1, akan tetap 1 (tidak menjadi 2). Jika 0, baru akan diisi kembali menjadi 1. Hal ini untuk mencegah penumpukan kredit gratis.
* **Batasan Fitur:**
  * Akses *Share Panel* **tidak** bisa di-password dan tautan otomatis dibuat acak/jelek (*Ugly Slug URL*).
  * Maksimal kru (vendor lapangan) yang terhubung: **5 Perangkat**.
  * Maksimal sesi (baris rundown): **8 Sesi**.
  * Akses Log Aktivitas (Audit Log): **Terkunci**.

### B. Paket Plus
* **Plus Bulanan:** Rp 199.000 / bulan
  * **Kredit:** Mendapat tambahan **4 Kredit Acara**, sehingga total menjadi **5 Kredit (4 Langganan + 1 Freemium)** per bulan.
  * **Aturan Kedaluwarsa:** 4 Kredit langganan ini **hangus (reset)** di akhir bulan (mendorong pengguna untuk terus memakai atau beralih ke tahunan). Sementara 1 kredit freemium tetap tunduk pada aturan dasarnya (selalu disetel ke angka 1). Jika mereka berhenti langganan (Unsubscribe), jatah 1 kredit Freemium bulanannya tetap aktif.
* **Plus Tahunan:** Rp 2.189.000 / tahun (Lebih hemat ~1 bulan)
  * **Kredit:** 4 Kredit Premium / bulan + 1 Kredit Free.
  * **Aturan Kedaluwarsa:** Kredit Premium **bisa rollover** (akumulasi), kredit Free tetap hangus (tunduk pada aturan dasar).
* **Fasilitas Paket Plus:**
  * Akses *Share Panel* **bisa** di-password dan memiliki tautan kustom yang elegan (**Vanity URL**).
  * Maksimal kru: **12 Perangkat**.
  * Maksimal sesi rundown: **20 Sesi**.
  * Akses Log Aktivitas (Audit Log): **Terbuka**.
  * *Tanpa* akses layar monitor.

### C. Paket Pro
* **Pro Bulanan:** Rp 399.000 / bulan
  * **Kredit:** 9 Kredit Premium + 1 Kredit Free (Total 10 Kredit/bulan).
  * **Aturan Kedaluwarsa:** Kredit (premium + free) **hangus** di akhir bulan (kredit free tunduk pada aturan dasar).
* **Pro Tahunan:** Rp 4.389.000 / tahun (Lebih hemat ~1 bulan)
  * **Kredit:** 9 Kredit Premium / bulan + 1 Kredit Free.
  * **Aturan Kedaluwarsa:** Kredit Premium **bisa rollover**.
* **Fasilitas Paket Pro:**
  * Akses *Share Panel* bisa di-password.
  * Maksimal kru: **20 Perangkat**.
  * Maksimal sesi rundown: **40 Sesi**.
  * Akses layar monitor: Maksimal **3 Layar**.
  * Custom Branding: **Custom Logo, Color, Background, & Fonts**.

### D. Paket Enterprise
* **Enterprise Tahunan:** Rp 9.999.000 / tahun
* **Kredit:** 49 Kredit Premium + 1 Kredit Free per bulan.
* **Aturan Kedaluwarsa:** Kredit Premium **rollover** otomatis.
* **Fasilitas Ultimate:**
  * Akses *Share Panel* bisa di-password.
  * Maksimal kru: **100 Perangkat**.
  * Maksimal sesi rundown: **Unlimited (Tidak terbatas)**.
  * Akses layar monitor: Maksimal **10 Layar**.
  * Custom Branding: **Custom Logo, Color, Background, & Fonts**.

---

## 3. Top-Up Kredit Satuan (Add-On)
Top-up ditujukan jika pengguna kehabisan kredit. Kredit hasil top-up ini **tidak pernah hangus (No Expiration)**. Skema harga dibuat lebih murah dengan *volume discount*:
* **1 Kredit:** Rp 69.000
* **3 Kredit:** Rp 199.000 *(Diskon kecil)*
* **5 Kredit:** Rp 299.000 *(Hanya Rp 59.800 / kredit)*
* **10 Kredit:** Rp 499.000 *(Hanya Rp 49.900 / kredit - Best Value!)*

---


