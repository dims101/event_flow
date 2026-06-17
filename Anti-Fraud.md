# Panduan Pencegahan Kecurangan (Anti-Fraud) EventFlow

Dokumen ini berisi analisis celah keamanan bisnis (*business logic loopholes*) dan aturan sistem yang ditetapkan untuk mencegah pengguna mengakali batasan kuota pada model pendapatan EventFlow.

## 1. Skenario "Daur Ulang Acara" (Event Recycling)

**Celah Kecurangan:**
Pengguna menggunakan 1 Room yang sudah di-*unlock*, lalu terus-menerus menghapus isinya dan mengganti nama acara untuk dipakai di event yang berbeda minggu depannya. Niatnya agar 1 Kredit bisa terpakai selamanya.

**Aturan Sistem (Pencegahan):**
* **Pengeditan Bebas:** Baris *rundown* selalu bisa ditambah/diedit dari jauh-jauh hari tanpa harus menggunakan kredit.
* **Kunci Tanggal Acara:** EO menggunakan 1 Kredit untuk menekan tombol "Unlock" yang akan menetapkan "Tanggal Acara". Setelah ditetapkan, **tanggal ini terkunci mati**. Untuk mengubah tanggal acara pada Room yang sudah di-unlock, EO **wajib** menggunakan 1 Kredit lagi.
* **Live Engine Lock (Kunci Mesin Real-Time):** Jantung utama aplikasi (tombol *Play/Pause/Stop*, *Master Timer*, *Macro Offset*, sinkronisasi *real-time* ke perangkat vendor) **HANYA BERFUNGSI** pada jendela waktu **H-1 hingga H+1** dari Tanggal Acara. 
* Di luar rentang waktu 3 hari tersebut, tombol *Play/Pause* akan mati (*disabled*) dan jam tidak akan berdetak secara sinkron. Ini membuat tautan vendor menjadi tabel "statis" belaka, sehingga Room tersebut tidak bisa dipakai diam-diam untuk acara langsung *weekend* depannya tanpa membayar kredit.

## 2. Skenario "Bagi-Bagi Akses Kru" (Bypass Device Limit)

**Celah Kecurangan:**
Pengguna di paket *Free* (batas 5 perangkat vendor) mencoba mengakali kuota dengan menyuruh krunya membuka dan menutup tautan secara bergantian. Mereka berasumsi sistem hanya membatasi "5 perangkat yang layar/browsernya sedang terbuka bersamaan".

**Aturan Sistem (Pencegahan):**
* **Persistent Device ID Tracking:** Sistem tidak melacak jumlah *koneksi aktif/online*, melainkan melacak **Jejak Perangkat Unik**. Saat perangkat membuka *link* untuk pertama kali, sistem menyimpan ID abadi di *LocalStorage browser* perangkat dan mencatatnya ke *database*.
* **Hard Block (Pemblokiran Keras):** Begitu *database* mendaftar 5 ID unik di sebuah Room, perangkat ke-6 yang mencoba masuk akan otomatis ditolak secara permanen dengan peringatan: *"Akses Ditolak: Batas Maksimal Perangkat Tercapai"*. Hal ini tetap berlaku *meskipun 5 perangkat pertama sedang offline atau browsernya ditutup.*
* **Friction for Upselling (Gesekan Pendorong Upgrade):** Satu-satunya cara agar perangkat ke-6 bisa masuk adalah EO harus login ke Dasbor Admin dan memencet tombol "Kick Device" pada salah satu dari 5 perangkat sebelumnya secara manual. Kerepotan luar biasa di tengah acara yang sedang berlangsung ini didesain secara spesifik untuk membuat EO frustrasi dan akhirnya menyerah, lalu **Upgrade ke Paket Plus/Pro** agar batas krunya langsung membesar.

## 3. Skenario "Ternak Akun" (Multi-Accounting)

**Celah Kecurangan:**
Karena setiap akun mendapat 1 Kredit Free, EO mencoba membuat banyak akun email (contoh: `eo.nikah1@gmail.com`, `eo.nikah2@...`) agar bisa membuat banyak acara secara gratis setiap bulan tanpa pernah *Top-Up* atau berlangganan.

**Aturan Sistem (Pencegahan):**
* **Splash Screen "Gengsi" (Social Friction):** Pada paket *Free*, saat *link* dibuka oleh vendor atau klien, layar akan menampilkan jeda waktu (*Splash Screen*) selama 3 detik bertuliskan **"Acara ini menggunakan EventFlow versi Gratis"** dan *watermark* permanen. Demi menjaga wibawa di depan klien yang membayar puluhan juta, EO akan merasa malu dan memilih untuk melakukan *Upgrade* agar *branding*-nya bersih.
* **Admin Device Fingerprinting:** Sistem menyimpan `Admin Device ID` abadi di *browser* laptop/PC milik sang EO. Jika satu laptop yang sama terdeteksi melakukan registrasi/login ke **lebih dari 2 alamat email yang berbeda**, sistem akan memblokir pemberian subsidi silang. Akun ke-3 dan seterusnya yang *login* dari laptop tersebut **tidak akan pernah menerima kuota 1 Kredit Gratis bulanan**. Ini mematikan upaya ternak akun secara masif dari satu komputer.

## 4. Skenario "Akal-akalan Ketiadaan Password" (Bypass Security Restrictions)

**Celah Kecurangan:**
Pada paket *Free*, tautan vendor/Share Panel tidak memiliki fitur *Password*. Pengguna mungkin bersikap abai dan berpikir, *"Biarin aja nggak di-password, toh link-nya nggak akan ada yang iseng buka selain vendor saya di grup WhatsApp."* Hal ini membuat fitur *Password* gagal menjadi dorongan (*driver*) bagi pengguna untuk melakukan *Upgrade*.

**Aturan Sistem (Pencegahan):**
* **Hukuman Reputasi (*Ugly Slug* vs *Vanity URL*):** Fitur *Password* digabungkan dengan estetika tautan. Pada paket *Free*, tautan yang dihasilkan otomatis menggunakan susunan karakter acak yang sangat panjang dan jelek (contoh: `eventflow.com/v/x8Jk92nM20-Zpq1-QwE8`). Hal ini mengurangi kesan profesional saat disebarkan oleh EO.
* **Tautan Kustom Berkelas (Paket Berbayar):** Pada paket Plus ke atas, fitur *Password* sepaket dengan **Vanity URL**. EO berbayar dapat mengubah tautan menjadi elegan dan bisa dibaca (contoh: `eventflow.com/v/Wedding-Ayu-Budi`). Menjaga wibawa (*prestige*) di mata klien dan vendor adalah *value driver* yang jauh lebih efektif bagi industri EO dibandingkan sekadar tawaran "keamanan data".
