"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, Search, ArrowLeft, Timer, MessageSquare, 
  WifiOff, Cpu, HelpCircle, Check, Copy, Sliders, Play, 
  Edit3, Trash2, GripVertical, FileText, AlertTriangle, 
  Clock, Share2, ChevronDown
} from "lucide-react";
import { EventFlowLogo } from "@/components/EventFlowLogo";

// Tipe data dokumentasi
interface DocItem {
  id: string;
  number: string;
  title: string;
  icon: React.ReactNode;
  summary: string;
  description: React.ReactNode;
}

export default function DocsPageClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>("rundown");
  const [isMobile, setIsMobile] = useState(false);

  // Deteksi ukuran layar untuk optimasi tampilan seluler
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const docItems: DocItem[] = [
    {
      id: "rundown",
      number: "1",
      title: "Mengelola Jadwal, Mengatur Urutan Acara (Seret & Lepas), dan Berbagi dengan Klien",
      icon: <Sliders className="w-5 h-5" />,
      summary: "Susun jadwal acara bersama tim, atur ulang urutan sesi cukup dengan seret-dan-lepas, serta bagikan tautan pantau khusus untuk pemilik acara.",
      description: (
        <div className="space-y-4 text-slate-355">
          <div className="border-l-2 border-indigo-500/50 pl-4 py-1 space-y-1.5">
            <h4 className="font-bold text-white text-sm">A. Membuat, Mengubah, dan Menghapus Sesi Acara</h4>
            <p className="text-xs leading-relaxed">
              Anda bisa mengatur daftar susunan acara (rundown) melalui tab <strong>&ldquo;Susun Rundown&rdquo;</strong> di dasbor detail event:
            </p>
            <ul className="list-disc pl-5 text-xs space-y-1 mt-1 leading-relaxed">
              <li><strong>Tambah Sesi:</strong> Isi kolom Nama Sesi (contoh: <em>&ldquo;Sambutan EO&rdquo;</em>), durasi waktu, target divisi yang bertanggung jawab (MC, Catering, MUA, Dokumentasi, atau Semua), dan nama penanggung jawab (PIC).</li>
              <li><strong>Ubah Sesi (Edit):</strong> Tekan tombol <span className="inline-flex items-center text-indigo-400 font-bold"><Edit3 className="w-3 h-3 inline mx-0.5" /> Edit</span> di baris sesi untuk langsung mengganti nama, durasi, atau target divisi secara instan.</li>
              <li><strong>Hapus Sesi:</strong> Tekan tombol <span className="inline-flex items-center text-rose-455 font-bold"><Trash2 className="w-3 h-3 inline mx-0.5" /> Hapus</span> untuk membersihkan sesi yang dibatalkan dari daftar.</li>
            </ul>
          </div>

          <div className="border-l-2 border-indigo-500/50 pl-4 py-1 space-y-1.5">
            <h4 className="font-bold text-white text-sm">B. Mengatur Urutan Sesi (Seret & Lepas)</h4>
            <p className="text-xs leading-relaxed">
              Ubah urutan susunan acara dengan mudah menggunakan fitur seret-dan-lepas yang didesain nyaman untuk komputer maupun ponsel:
            </p>
            <ul className="list-disc pl-5 text-xs space-y-1 mt-1 leading-relaxed">
              <li>Sentuh atau klik lalu tahan tombol pegangan <span className="inline-flex items-center text-slate-400"><GripVertical className="w-3.5 h-3.5 inline mx-0.5" /></span> di sebelah kiri sesi.</li>
              <li>Geser sesi ke atas atau ke bawah untuk menaruhnya di posisi yang baru.</li>
              <li>Sistem akan menghitung kembali urutan panggung dan memperbarui estimasi jam mulai untuk semua sesi berikutnya secara otomatis.</li>
            </ul>
          </div>

          <div className="border-l-2 border-indigo-500/50 pl-4 py-1 space-y-1.5">
            <h4 className="font-bold text-white text-sm">C. Berbagi Akses khusus Klien (Pemilik Acara)</h4>
            <p className="text-xs leading-relaxed">
              Kirimkan tautan khusus Klien/Pemilik Acara agar mereka tetap bisa memantau jalannya acara:
            </p>
            <ul className="list-disc pl-5 text-xs space-y-1 mt-1 leading-relaxed">
              <li><strong>Akses Hanya Pantau:</strong> Pemilik acara bisa melihat rundown yang sedang berjalan secara langsung tanpa risiko salah memencet tombol ubah atau hapus.</li>
              <li><strong>Cetak Ramah PDF:</strong> Tersedia tombol cetak fisik yang akan merapikan layout tabel rundown dan menyembunyikan tombol-tombol sistem, sehingga siap diekspor menjadi dokumen cetak yang bersih.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: "control-center",
      number: "2",
      title: "Pusat Kendali Waktu (Memulai, Jeda, Geser Waktu, dan Lewati Sesi)",
      icon: <Play className="w-5 h-5" />,
      summary: "Kendalikan jalannya waktu panggung langsung dari satu layar. Mulai, jeda, tambah atau kurangi durasi panggung, atau langsung lewati ke sesi selanjutnya secara instan.",
      description: (
        <div className="space-y-4 text-slate-355">
          <p className="text-xs leading-relaxed">
            Dasbor pimpinan acara (Show Caller) mempermudah koordinasi waktu di panggung secara terpusat:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1">
              <h5 className="font-bold text-white text-xs flex items-center gap-1">
                <Play className="w-3.5 h-3.5 text-indigo-400" /> Play & Pause
              </h5>
              <p className="text-[11px] text-slate-400 leading-normal">
                Memulai atau menghentikan sementara hitung mundur. Saat jeda aktif, lampu indikator status di HP kru akan otomatis berubah jingga.
              </p>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1">
              <h5 className="font-bold text-white text-xs flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" /> Penyesuaian Menit
              </h5>
              <p className="text-[11px] text-slate-400 leading-normal">
                Gunakan tombol instan <strong>+1m</strong>, <strong>+5m</strong>, dan <strong>-1m</strong> untuk langsung menambah atau mengurangi sisa menit sesi aktif di HP kru lapangan.
              </p>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1">
              <h5 className="font-bold text-white text-xs flex items-center gap-1">
                <Timer className="w-3.5 h-3.5 text-indigo-400" /> Lewati Sesi
              </h5>
              <p className="text-[11px] text-slate-400 leading-normal">
                Akhiri sesi yang berjalan sebelum durasinya habis untuk langsung memulai hitung mundur sesi selanjutnya di seluruh layar kru lapangan.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "share-panel",
      number: "3",
      title: "Membagikan Akses Rundown (WhatsApp & Salin Tautan Cepat)",
      icon: <Share2 className="w-5 h-5" />,
      summary: "Bagikan akses rundown langsung ke WhatsApp kru, layar monitor panggung, atau pemilik acara secara cepat tanpa perlu mendaftar akun.",
      description: (
        <div className="space-y-3 text-slate-355">
          <p className="text-xs leading-relaxed">
            Kru lapangan tidak perlu membuang waktu untuk login atau memasukkan kata sandi. Cukup gunakan menu berbagi untuk menyalin tautan:
          </p>
          <ul className="list-disc pl-5 text-xs space-y-1.5 leading-relaxed">
            <li><strong>Tautan Kru Bersama:</strong> Tautan khusus agar seluruh kru lapangan bisa memantau jadwal dan sisa durasi sesi langsung di HP masing-masing.</li>
            <li><strong>Tampilan Monitor Panggung:</strong> Tampilan dengan huruf berukuran besar yang didesain agar mudah dibaca jika ditayangkan di layar TV atau proyektor panggung.</li>
            <li><strong>Tautan Pemilik Acara:</strong> Tautan pratinjau khusus klien dengan opsi cetak fisik yang rapi.</li>
            <li><strong>Tombol WhatsApp Instan:</strong> Klik tombol berbagi untuk mengirim pesan otomatis berisi link akses rundown langsung ke kontak kru via WhatsApp.</li>
          </ul>
        </div>
      )
    },
    {
      id: "prompter",
      number: "4",
      title: "Prompter Pesan (Instruksi Instan & Alarm Getar)",
      icon: <MessageSquare className="w-5 h-5" />,
      summary: "Kirim instruksi kilat langsung ke layar MC atau kru tertentu, lengkap dengan kedipan layar dan getaran di ponsel mereka agar pesan langsung dibaca.",
      description: (
        <div className="space-y-3 text-slate-355">
          <p className="text-xs leading-relaxed">
            Kirimkan instruksi darurat langsung ke saku kru tanpa perlu berteriak di HT panggung:
          </p>
          <ol className="list-decimal pl-5 text-xs space-y-1.5 leading-relaxed">
            <li>Buka formulir pesan di bagian bawah panel kendali pimpinan acara.</li>
            <li>Pilih target divisi (MC, Catering, MUA, Dokumentasi, atau Semua).</li>
            <li>Ketik pesan pendek (contoh: <em>&ldquo;MC tolong perpanjang pembukaan, MUA masih merapikan riasan&rdquo;</em>).</li>
            <li>Kirim pesan. Layar HP kru akan berkedip neon disertai getaran ponsel agar pesan langsung disadari dan dibaca.</li>
          </ol>
        </div>
      )
    },
    {
      id: "activity-log",
      number: "5",
      title: "Catatan Aktivitas Acara (Log Hari-H)",
      icon: <FileText className="w-5 h-5" />,
      summary: "Pantau setiap perubahan waktu, jeda, dan pesan prompter secara langsung lewat catatan aktivitas otomatis terpadu.",
      description: (
        <div className="space-y-3 text-slate-355">
          <p className="text-xs leading-relaxed">
            Setiap tindakan kendali (memulai, menjeda, menambah menit, melompati sesi, mengirim pesan prompter) dicatat secara otomatis dalam log aktivitas:
          </p>
          <div className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1.5">
            <h5 className="font-bold text-white text-[11px] uppercase tracking-wider">Pembaruan Catatan Otomatis:</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Catatan diperbarui secara otomatis di layar admin tanpa perlu memuat ulang halaman browser. Riwayat dibatasi hanya untuk 30 catatan aktivitas terbaru agar tampilan tetap rapi dan hemat memori ponsel.
            </p>
          </div>
        </div>
      )
    },
    {
      id: "stage-timer",
      number: "6",
      title: "Ketepatan Timer (Anti-Eror di Latar Belakang)",
      icon: <Timer className="w-5 h-5" />,
      summary: "Hitung mundur panggung dijamin tetap berjalan presisi, bahkan saat ponsel kru terkunci di dalam saku atau tab browser sedang tidak aktif.",
      description: (
        <div className="space-y-3 text-slate-355">
          <p className="text-xs leading-relaxed">
            Untuk menghemat daya baterai, ponsel pintar biasanya menonaktifkan aktivitas browser saat layar dikunci. Hal ini sering membuat jam hitung mundur berhenti atau lambat.
          </p>
          <div className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5 space-y-2">
            <h5 className="font-bold text-indigo-400 text-xs flex items-center gap-1">
              <Cpu className="w-4 h-4" /> Solusi Sistem Hitung Mundur Mandiri
            </h5>
            <p className="text-[11px] leading-relaxed">
              EventFlow memindahkan logika mesin hitung mundur ke sistem thread terpisah di latar belakang browser. Ini membuat perhitungan jam mundur panggung tetap berjalan akurat 100% saat ponsel dimasukkan ke saku atau layar dimatikan.
            </p>
          </div>
        </div>
      )
    },
    {
      id: "offline-first",
      number: "7",
      title: "Ketahanan Sinyal Buruk (Mode Offline)",
      icon: <WifiOff className="w-5 h-5" />,
      summary: "Acara tetap berjalan lancar meski internet mati total. Aplikasi otomatis menyimpan data ke browser gawai dan lanjut menghitung mundur secara offline.",
      description: (
        <div className="space-y-3 text-slate-355">
          <p className="text-xs leading-relaxed">
            EventFlow didesain tahan terhadap sinyal buruk (blank spot) di dalam gedung pertemuan atau ballroom beton:
          </p>
          <ul className="list-disc pl-5 text-xs space-y-2 leading-relaxed">
            <li>
              <strong>Aplikasi Web Mandiri:</strong> Aplikasi dapat ditambahkan ke layar utama HP (Home Screen) seperti aplikasi biasa, dan dapat dibuka kapan saja tanpa memerlukan koneksi internet aktif.
            </li>
            <li>
              <strong>Penyimpanan Browser:</strong> Jadwal rundown yang berhasil dimuat otomatis tersimpan di memori browser gawai Anda.
            </li>
            <li>
              <strong>Beralih Mode Otomatis:</strong> Saat internet terputus, aplikasi langsung membaca rundown dari memori browser dan lanjut menghitung mundur memakai jam internal ponsel Anda. Dot status akan berubah menjadi warna kuning sebagai penanda offline.
            </li>
          </ul>
        </div>
      )
    }
  ];

  // Filter berdasarkan pencarian
  const filteredDocs = docItems.filter((item) => {
    return searchQuery === "" || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start bg-[#050505] text-slate-100 overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200 font-sans">
      
      {/* Cinematic Grid Noise Overlay */}
      <div className="fixed inset-0 z-50 pointer-events-none opacity-[0.015] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
      
      {/* Glow Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.06)_0%,transparent_70%)] blur-[90px]" />
        <div className="absolute bottom-10 -left-10 w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.03)_0%,transparent_70%)] blur-[80px]" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 w-full bg-slate-950/80 border-b border-white/5 px-4 md:px-6 py-4.5 backdrop-blur-xl z-40 shadow-sm flex items-center justify-between">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="p-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-slate-350 hover:text-white transition-colors"
              aria-label="Kembali ke Beranda"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
            <Link href="/" className="flex items-center gap-1.5 select-none">
              <EventFlowLogo className="h-5.5 w-auto" />
            </Link>
            <span className="hidden sm:inline-block w-px h-4 bg-slate-800" />
            <span className="hidden sm:inline-block text-[10px] font-extrabold tracking-widest text-slate-500 uppercase">
              Dokumentasi
            </span>
          </div>

          <Link 
            href="/dashboard" 
            className="text-xs font-bold bg-indigo-650 hover:bg-indigo-600 text-white rounded-full px-4.5 py-2 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Buka Dasbor
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-4xl px-4 sm:px-6 py-8 md:py-12 flex flex-col gap-8 md:gap-10">
        
        {/* Document Title Header */}
        <section className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/10 bg-indigo-500/5 text-indigo-400 text-[10px] font-bold uppercase tracking-[0.2em] select-none">
            <BookOpen className="w-3.5 h-3.5" />
            Pusat Panduan Fitur
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
            Dokumentasi Penggunaan EventFlow
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-2xl font-medium">
            Panduan operasional lengkap aplikasi EventFlow untuk mempermudah koordinasi Show Caller (EO) dan kru lapangan selama hari-H acara.
          </p>
        </section>

        {/* Search Bar - Optimized for Mobile */}
        <section className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cari panduan fitur (misalnya: seret, geser waktu, pesan MC, cetak)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              // Secara otomatis perluas kecocokan pertama saat mencari
              if (e.target.value.trim() !== "") {
                const match = docItems.find(item => 
                  item.title.toLowerCase().includes(e.target.value.toLowerCase()) || 
                  item.summary.toLowerCase().includes(e.target.value.toLowerCase()) || 
                  item.id.toLowerCase().includes(e.target.value.toLowerCase())
                );
                if (match) setExpandedSection(match.id);
              }
            }}
            className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </section>

        {/* Collapsible Accordion Documentation List - High Mobile Usability */}
        <section className="space-y-4">
          {filteredDocs.length > 0 ? (
            filteredDocs.map((item) => {
              const isExpanded = expandedSection === item.id;
              return (
                <div 
                  key={item.id}
                  id={`sec-${item.id}`}
                  className={`bg-white/5 border rounded-2xl p-1 transition-all duration-300 ${isExpanded ? "border-indigo-500/20 shadow-lg bg-slate-900/10" : "border-white/10 hover:border-white/15"}`}
                >
                  <div className="bg-slate-950/80 border border-white/5 rounded-[calc(1rem-0.125rem)] overflow-hidden">
                    
                    {/* Header Button (Trigger Expand) */}
                    <button
                      onClick={() => setExpandedSection(isExpanded ? null : item.id)}
                      className="w-full flex items-start justify-between p-5 text-left transition-colors focus:outline-none cursor-pointer"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex gap-3.5 pr-4">
                        <div className={`p-2.5 rounded-xl border shrink-0 transition-colors ${isExpanded ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-white/5 border-white/5 text-slate-400'}`}>
                          {item.icon}
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold tracking-widest text-indigo-400 block uppercase">
                            FITUR PANDUAN 0{item.number}
                          </span>
                          <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                            {item.title}
                          </h2>
                          {!isExpanded && (
                            <p className="text-xs text-slate-400 line-clamp-1 font-medium pt-0.5">
                              {item.summary}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-slate-400 shrink-0 self-center">
                        <ChevronDown className={`w-4 h-4 transition-transform duration-350 ${isExpanded ? "rotate-180 text-indigo-400" : ""}`} />
                      </div>
                    </button>

                    {/* Collapsible Content */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          key="content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                          className="overflow-hidden border-t border-white/5"
                        >
                          <div className="px-5 py-5 space-y-4">
                            <p className="text-xs sm:text-sm text-slate-355 leading-relaxed font-semibold">
                              {item.summary}
                            </p>
                            
                            <hr className="border-white/5" />

                            <div className="text-xs sm:text-sm leading-relaxed space-y-4">
                              {item.description}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl text-slate-400 space-y-2">
              <AlertTriangle className="w-10 h-10 mx-auto text-amber-500/50" />
              <h3 className="font-bold text-white text-sm">Panduan tidak ditemukan</h3>
              <p className="text-xs text-slate-500">Belum menemukan yang Anda cari? Coba ketik kata kunci lain yang sederhana seperti 'timer', 'dnd', atau klik daftar isi di samping.</p>
            </div>
          )}
        </section>

        {/* Quick Reference FAQ - Mobile Optimized */}
        <section className="space-y-4 mt-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-extrabold text-slate-350 tracking-widest uppercase">
              Petunjuk Cepat / FAQ
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-white/5 bg-slate-900/10 space-y-1.5">
              <h4 className="text-xs font-bold text-white">Bagaimana cara membagikan rundown ke kru?</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                Cukup buka <strong>Share Panel</strong>, lalu klik tombol <strong>Salin Tautan</strong> atau <strong>WhatsApp</strong> di samping peran divisi kru. Tautan ini bersifat instan dan kru tidak perlu mendaftar akun.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-white/5 bg-slate-900/10 space-y-1.5">
              <h4 className="text-xs font-bold text-white">Mengapa HP kru bisa bergetar saat menerima pesan?</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                EventFlow mendeteksi pesan masuk dan memicu getaran ponsel lewat peramban. Ini membantu memotong perhatian kru di tengah keramaian atau kebisingan suara panggung.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-white/5 bg-slate-900/10 space-y-1.5">
              <h4 className="text-xs font-bold text-white">Bagaimana cara mencetak PDF rundown yang rapi?</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                Gunakan tautan <strong>Tautan Pemilik Acara</strong>, lalu buka di komputer atau tablet dan tekan tombol <strong>Cetak PDF</strong>. Tampilan cetak kami otomatis menyembunyikan tombol-tombol sistem agar hasil cetakan bersih.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-white/5 bg-slate-900/10 space-y-1.5">
              <h4 className="text-xs font-bold text-white">Apakah timer akan terhenti saat layar ponsel kru mati?</h4>
              <p className="text-[11px] text-slate-450 leading-relaxed font-medium">
                Tidak. EventFlow menggunakan teknologi <strong>Web Worker</strong> di latar belakang gawai untuk memastikan hitung mundur panggung tetap berjalan akurat 100% saat layar HP mati.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full py-10 text-center text-xs text-slate-500 border-t border-white/5 bg-slate-950/90 z-20 mt-10">
        <p className="font-semibold tracking-wider uppercase text-[10px] text-slate-650">
          &copy; {new Date().getFullYear()} EventFlow. Semua hak dilindungi.
        </p>
      </footer>

    </div>
  );
}
