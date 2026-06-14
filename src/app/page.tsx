import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-slate-950 text-slate-100 px-6">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(168,85,247,0.1),transparent_50%)]" />

      {/* Hero section */}
      <div className="relative z-10 max-w-4xl w-full text-center space-y-8 py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          Hari-H Event Control Panel
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
          EventFlow<span className="text-indigo-500">.</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Kendalikan linimasa acara (*rundown*) dan komunikasi tim kru lapangan secara *real-time*, ultra-cepat, dan *offline-resilient* langsung dari gawai Anda.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/25 text-center"
          >
            Masuk sebagai EO
          </Link>
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-semibold rounded-xl transition-all duration-200 text-center"
          >
            Daftar Akun Baru
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-16 text-left">
          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-sm space-y-3">
            <div className="text-3xl">⏱️</div>
            <h3 className="text-lg font-bold text-slate-100">Smart Dynamic Rundown</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Show Caller dapat memajukan, memundurkan, atau menunda jadwal acara secara instan. Jadwal kru otomatis bergeser dalam hitungan milidetik.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-sm space-y-3">
            <div className="text-3xl">📳</div>
            <h3 className="text-lg font-bold text-slate-100">Pocket Prompter & Haptic Cues</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Kirim instruksi teks senyap ke divisi tertentu (cth: MC, Catering). Layar berkedip dan memicu getaran haptic secara instan.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-sm space-y-3">
            <div className="text-3xl">🔗</div>
            <h3 className="text-lg font-bold text-slate-100">Vendor Links (No-Login)</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Cukup bagikan tautan unik via WhatsApp. Kru & vendor luar langsung masuk ke dasbor pantau sesuai perannya tanpa perlu register.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-sm space-y-3">
            <div className="text-3xl">✈️</div>
            <h3 className="text-lg font-bold text-slate-100">Offline-Sync Resilient</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Koneksi terputus di dalam ballroom? Aplikasi tetap berjalan, menampilkan jadwal, dan menghitung mundur waktu secara lokal via IndexedDB.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
