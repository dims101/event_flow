import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Timer, MessageSquare, Link2, WifiOff, HelpCircle } from "lucide-react";
import { Pricing } from "@/components/pricing";
import { EventFlowLogo } from "@/components/EventFlowLogo";

const eventFlowPlans = [
  {
    name: "STARTER",
    price: "149000",
    yearlyPrice: "119000",
    period: "per month",
    features: [
      "Maksimal 3 Active Rooms (Events)",
      "Fitur Rundown Builder Dasar",
      "Pusat Kendali Hari-H (Master Timer)",
      "Akses Link Kru/Vendor Tanpa Login",
      "Dukungan Penyimpanan Lokal (Offline-First)",
      "Dukungan Komunitas via Discord",
    ],
    description: "Cocok untuk Event Organizer pemula atau skala kecil / perorangan.",
    buttonText: "Mulai Uji Coba Gratis",
    href: "/register",
    isPopular: false,
  },
  {
    name: "PROFESSIONAL",
    price: "399000",
    yearlyPrice: "319000",
    period: "per month",
    features: [
      "Unlimited Active Rooms (Events)",
      "Sinkronisasi Supabase Realtime",
      "Fitur Divisi Vendor Tanpa Batas",
      "Jendela Melayang Picture-in-Picture (PiP)",
      "Anti-Throttling Web Worker Timer",
      "Log Aktivitas Real-time (Audit Logs)",
      "Prioritas Sinkronisasi Waktu Mikro",
    ],
    description: "Ideal untuk agensi Event Organizer aktif yang mengelola banyak acara sekaligus.",
    buttonText: "Langganan Sekarang",
    href: "/register",
    isPopular: true,
  },
  {
    name: "ENTERPRISE",
    price: "1299000",
    yearlyPrice: "1039000",
    period: "per month",
    features: [
      "Semua fitur paket Professional",
      "Push Notifications Instan via Web Push",
      "Prioritas Bandwidth & Latensi Terendah",
      "On-Site Support / Kru Siaga dari EventFlow",
      "Dedicated Account Manager 24/7",
      "SLA Keandalan Sistem & Server 99.99%",
      "Kustomisasi Integrasi API",
    ],
    description: "Khusus untuk penyelenggara konser besar, konferensi tingkat tinggi, atau korporat.",
    buttonText: "Hubungi Sales",
    href: "/register",
    isPopular: false,
  },
];

const faqs = [
  {
    question: "Bagaimana cara kerja sinkronisasi real-time EventFlow?",
    answer: "EventFlow menggunakan Supabase Realtime via WebSockets untuk menyinkronkan data rundown secara instan. Ketika Show Caller melakukan intervensi waktu (seperti +1m atau -1m), perubahan tersebut langsung diteruskan ke seluruh gawai vendor yang aktif tanpa ada delay kueri database.",
  },
  {
    question: "Apakah aplikasi tetap berfungsi jika jaringan internet buruk?",
    answer: "Ya, EventFlow dirancang dengan arsitektur offline-first. Rundown di-cache secara lokal di gawai menggunakan IndexedDB. Jika koneksi terputus, timer hitung mundur tetap berjalan presisi menggunakan pencatatan waktu internal perangkat.",
  },
  {
    question: "Apakah para kru atau vendor lapangan harus membuat akun?",
    answer: "Tidak perlu. EO cukup membagikan tautan quick-share unik (misal via WhatsApp). Kru lapangan dapat memantau rundown sesuai peran mereka langsung dari browser gawai masing-masing tanpa harus melakukan login.",
  },
  {
    question: "Apa itu fitur Picture-in-Picture (PiP) di EventFlow?",
    answer: "Fitur PiP memungkinkan Show Caller untuk membuka jendela mini melayang yang selalu berada di paling depan layar desktop. Dengan ini, Anda tetap bisa memantau master timer rundown sambil membuka aplikasi lain (seperti mixer suara atau slide presentasi).",
  },
];

export default async function Home() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start bg-slate-950 text-slate-100 overflow-x-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(12,102,228,0.12),transparent_55%)] animate-in fade-in duration-1000" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(12,102,228,0.04),transparent_50%)] pointer-events-none" />

      {/* Navigation Header */}
      <header className="relative z-20 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-900/30">
        <Link href="/" className="flex items-center gap-1.5 select-none" aria-label="EventFlow Home">
          <EventFlowLogo className="h-10 md:h-12 w-auto" />
        </Link>
        
        {/* Nav Anchors */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <a href="#features" className="hover:text-slate-100 transition-colors">Fitur</a>
          <a href="#pricing" className="hover:text-slate-100 transition-colors">Harga & Paket</a>
          <a href="#faq" className="hover:text-slate-100 transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-slate-100 transition-colors"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-sm select-none"
          >
            Daftar Gratis
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-4xl w-full text-center space-y-8 py-20 px-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/10 text-indigo-400 text-xs font-semibold tracking-wide select-none animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          ⏱️ Asisten Koordinasi Rundown Hari-H
        </div>

        <div className="flex justify-center select-none py-4">
          <EventFlowLogo className="h-28 md:h-40 w-auto" />
        </div>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Kelola jadwal panggung (*rundown*) secara *real-time* dan kirim instruksi instan ke kru lapangan. Aplikasi tetap berjalan lancar meski di area susah sinyal.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4 max-w-md mx-auto">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors duration-150 text-center shadow-sm select-none"
          >
            Masuk ke Dasbor
          </Link>
          <a
            href="#pricing"
            className="w-full sm:w-auto px-8 py-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-200 font-semibold rounded-lg transition-colors duration-150 text-center select-none"
          >
            Lihat Paket Harga
          </a>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section id="features" className="relative z-10 max-w-5xl w-full py-16 px-6 border-t border-slate-900/60 scroll-mt-6">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-slate-100">Dirancang untuk Event Skala Tinggi</h2>
          <p className="text-slate-400 text-sm max-w-lg mx-auto">Mengatasi masalah koordinasi klasik: miskomunikasi waktu dan hilangnya sinyal di lapangan.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="p-6 rounded-xl border border-slate-900 bg-slate-900/20 backdrop-blur-sm space-y-3 hover:border-slate-850 transition duration-150">
            <div className="text-indigo-400"><Timer className="w-6 h-6" /></div>
            <h3 className="text-base font-bold text-slate-100 font-sans">Rundown Dinamis</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sesuaikan durasi acara secara real-time saat terjadi kendala di panggung. Jadwal rundown seluruh kru dan vendor otomatis bergeser seketika.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-900 bg-slate-900/20 backdrop-blur-sm space-y-3 hover:border-slate-850 transition duration-150">
            <div className="text-indigo-400"><MessageSquare className="w-6 h-6" /></div>
            <h3 className="text-base font-bold text-slate-100 font-sans">Prompter Saku Instan</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Kirim instruksi penting ke divisi tertentu (seperti MC atau Catering). Layar ponsel target akan berkedip dan bergetar agar instruksi langsung terbaca.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-900 bg-slate-900/20 backdrop-blur-sm space-y-3 hover:border-slate-850 transition duration-150">
            <div className="text-indigo-400"><Link2 className="w-6 h-6" /></div>
            <h3 className="text-base font-bold text-slate-100 font-sans">Akses Instan Tanpa Login</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Bagikan tautan khusus peran kru via WhatsApp. Kru lapangan dan vendor bisa langsung memantau rundown tanpa repot mendaftar akun.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-900 bg-slate-900/20 backdrop-blur-sm space-y-3 hover:border-slate-850 transition duration-150">
            <div className="text-indigo-400"><WifiOff className="w-6 h-6" /></div>
            <h3 className="text-base font-bold text-slate-100 font-sans">Tetap Lancar Tanpa Sinyal</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sinyal mendadak hilang di ballroom? Jangan khawatir. Aplikasi otomatis menyimpan data terbaru agar hitung mundur rundown tetap berjalan presisi.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative w-full border-t border-slate-900/60 bg-slate-950/40 py-8 scroll-mt-6">
        <Pricing
          plans={eventFlowPlans}
          title="Investasi Tepat untuk Event Sempurna"
          description="Pilih paket yang paling sesuai dengan skala EO Anda. Semua paket dilengkapi dengan fitur offline-first dan sinkronisasi real-time."
        />
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative z-10 w-full max-w-4xl mx-auto px-6 py-20 border-t border-slate-900/60 scroll-mt-6">
        <div className="text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-800 bg-slate-900/40 text-indigo-400 text-xs font-semibold select-none">
            <HelpCircle className="w-3.5 h-3.5" />
            Pertanyaan yang Sering Diajukan
          </div>
          <h3 className="text-2xl font-bold tracking-tight sm:text-3xl text-slate-100 font-sans">
            Masih Bingung Memilih?
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="p-6 rounded-xl border border-slate-900 bg-slate-900/30 backdrop-blur-sm space-y-2 hover:border-slate-850 transition duration-150"
            >
              <h4 className="font-bold text-slate-100 text-base">{faq.question}</h4>
              <p className="text-sm text-slate-400 leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="relative z-15 w-full py-8 text-center text-xs text-slate-500 border-t border-slate-900/40 mt-10">
        <p>&copy; {new Date().getFullYear()} EventFlow. Semua hak dilindungi.</p>
      </footer>
    </div>
  );
}
