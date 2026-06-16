# 💙 Atlassian Design System — Panduan & Integrasi Token Warna

Dokumen ini menjelaskan pilar utama, arsitektur token warna, prinsip aksesibilitas, serta detail implementasi tema warna berdasarkan **Atlassian Design System (ADS)**.

---

## 🌟 1. Filosofi & Prinsip Utama
Atlassian Design System dibuat untuk membantu tim membangun antarmuka yang konsisten, berpusat pada pengguna, dan berkinerja tinggi. Desain Atlassian berlandaskan tiga pilar utama:
1. **Be Bold (Berani)**: Memotivasi tim untuk melakukan pekerjaan terbaik mereka. Memberikan rekomendasi dan bantuan yang secukupnya lalu membiarkan pengguna melanjutkan pekerjaan mereka secara produktif.
2. **Be Optimistic (Optimis)**: Membangun kepercayaan melalui konsistensi visual dan pengalaman produk yang dapat diandalkan, serta memberikan informasi fitur dan peluang baru pada saat yang tepat.
3. **Be Practical, with a wink (Praktis dengan Sedikit Humor)**: Menjaga narasi tetap ringkas dan langsung pada sasaran. Bahasa yang digunakan mudah dipahami oleh siapa saja, di mana saja, tanpa memandang perbedaan budaya atau bahasa.

---

## 🎨 2. Arsitektur Token Warna (Design Tokens)
Atlassian menggunakan sistem **Design Tokens** (Semantic Tokens) untuk mendefinisikan warna. Token warna tidak merujuk pada nama warna fisik (seperti `blue-500`), melainkan pada peran atau kegunaan semantiknya di UI (seperti `color.background.brand.bold`).

### Keuntungan Token Semantik:
* **Symmetry (Simetri)**: Satu token akan secara otomatis memetakan nilainya ke warna yang sesuai saat pengguna berganti dari mode terang ke mode gelap.
* **Maintainability**: Memudahkan penggantian warna secara global tanpa perlu memodifikasi kode komponen secara individual.
* **Keterbacaan & Aksesibilitas**: Skema warna telah dioptimalkan untuk rasio kontras WCAG 2.2 AA secara otomatis.

---

## 📊 3. Pemetaan Warna Atlassian (Light vs. Dark Mode)

Berikut adalah tabel pemetaan token warna utama Atlassian Design System beserta nilai Hex aktual dan representasi format **OKLCH** (yang digunakan di EventFlow):

| Peran Token | Token Semantik Atlassian | Light Mode (Hex) | Light Mode (OKLCH) | Dark Mode (Hex) | Dark Mode (OKLCH) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Page Background** | `color.background.neutral` | `#FAFBFC` | `oklch(0.985 0.002 247.9)` | `#1D2125` | `oklch(0.203 0.009 252.3)` |
| **Card / Surface** | `elevation.surface` | `#FFFFFF` | `oklch(1.000 0.000 0.0)` | `#22272B` | `oklch(0.224 0.010 252.3)` |
| **Inner Panel / Input**| `color.background.input` | `#F4F5F7` | `oklch(0.967 0.003 247.9)` | `#2C333A` | `oklch(0.264 0.012 252.3)` |
| **Hover Highlight** | `color.background.neutral.subtle.hovered` | `#EBECF0` | `oklch(0.938 0.004 247.9)` | `#3C444E` | `oklch(0.318 0.015 252.3)` |
| **Standard Border** | `color.border` | `#DFE1E6` | `oklch(0.898 0.006 247.9)` | `#454F59` | `oklch(0.354 0.016 252.3)` |
| **Strong Border** | `color.border.disabled` | `#C1C7D0` | `oklch(0.803 0.010 247.9)` | `#5A6673` | `oklch(0.428 0.020 252.3)` |
| **Primary Text** | `color.text` | `#091E42` | `oklch(0.148 0.027 257.0)` | `#E4E6EA` | `oklch(0.916 0.009 248.8)` |
| **Secondary Text** | `color.text.subtle` | `#42526E` | `oklch(0.364 0.026 248.8)` | `#9FADBC` | `oklch(0.718 0.017 248.8)` |
| **Muted Text** | `color.text.subtle.muted` | `#5E6C84` | `oklch(0.468 0.023 248.8)` | `#8C9BAB` | `oklch(0.655 0.018 248.8)` |
| **Brand Primary** | `color.background.brand.bold` | `#0C66E4` | `oklch(0.485 0.207 266.6)` | `#579DFF` | `oklch(0.686 0.156 257.6)` |
| **Brand Subtle** | `color.background.brand` | `#DEEBFF` | `oklch(0.927 0.038 259.9)` | `#1C2B41` | `oklch(0.231 0.046 258.9)` |
| **Status Success** | `color.background.success.bold`| `#1F845A` | `oklch(0.505 0.141 156.4)` | `#23A36D` | `oklch(0.628 0.165 156.4)` |
| **Status Danger** | `color.background.danger.bold` | `#CA3521` | `oklch(0.462 0.198 28.5)` | `#E54937` | `oklch(0.551 0.206 28.5)` |
| **Status Warning** | `color.background.warning.bold`| `#E2B53E` | `oklch(0.771 0.158 81.3)` | `#F5CD47` | `oklch(0.835 0.177 81.3)` |

---

## ♿ 4. Aksesibilitas (WCAG 2.2) & Inversi Warna Otomatis
Pilar penting dalam implementasi ADS adalah **Legibilitas Kontras Tinggi**:
1. **Automatic Color Inversion**: Komponen teks dan heading di dalam ADS akan mendeteksi kontainer dengan warna latar belakang yang tebal/pekat (seperti `color.background.brand.bold`) dan secara otomatis mengubah warnanya menjadi teks kontras tinggi (`color.text.inverse` / putih).
2. **Accessible Light & Dark Contrast**: Mode gelap menggunakan pendekatan saturasi yang lebih rendah (desaturated) untuk warna primer agar tidak menyilaukan mata pengguna, sementara mode terang menggunakan warna biru solid tua untuk keterbacaan di bawah sinar matahari langsung.

---

## ⚙️ 5. Cara Menerapkan Tema Atlassian di EventFlow
Untuk menggunakan tema ini pada EventFlow secara langsung, isi berkas [atlassian-theme.json](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/atlassian-theme.json) dipetakan ke dalam variabel CSS di dalam berkas [globals.css](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/globals.css) pada bagian blok `:root` dan `:root.dark`.
