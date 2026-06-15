import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Timer, MessageSquare, Link2, WifiOff } from "lucide-react";

export default async function Home() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-slate-950 text-slate-100 px-6">
      {/* Atlassian Blue dynamic background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(12,102,228,0.12),transparent_55%)] animate-in fade-in duration-1000" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(12,102,228,0.04),transparent_50%)]" />

      {/* Hero section */}
      <div className="relative z-10 max-w-4xl w-full text-center space-y-8 py-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/10 text-indigo-400 text-xs font-semibold tracking-wide">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          ⏱️ Asisten Koordinasi Rundown Hari-H
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent font-sans">
          EventFlow<span className="text-indigo-500">.</span>
        </h1>

        <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Kelola jadwal panggung (*rundown*) secara *real-time* dan kirim instruksi instan ke kru lapangan. Aplikasi tetap berjalan lancar meski di area susah sinyal.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 max-w-md mx-auto">
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors duration-150 text-center shadow-sm select-none"
          >
            Masuk ke Dasbor
          </Link>
          <Link
            href="/register"
            className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-200 font-semibold rounded-lg transition-colors duration-150 text-center select-none"
          >
            Mulai Gratis
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-16 text-left">
          <div className="p-6 rounded-xl border border-slate-900 bg-slate-900/20 backdrop-blur-sm space-y-3 hover:border-slate-800 transition duration-150">
            <div className="text-indigo-400"><Timer className="w-6 h-6" /></div>
            <h3 className="text-base font-bold text-slate-100 font-sans">Rundown Dinamis</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sesuaikan durasi acara secara real-time saat terjadi kendala di panggung. Jadwal rundown seluruh kru dan vendor otomatis bergeser seketika.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-900 bg-slate-900/20 backdrop-blur-sm space-y-3 hover:border-slate-800 transition duration-150">
            <div className="text-indigo-400"><MessageSquare className="w-6 h-6" /></div>
            <h3 className="text-base font-bold text-slate-100 font-sans">Prompter Saku Instan</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Kirim instruksi penting ke divisi tertentu (seperti MC atau Catering). Layar ponsel target akan berkedip dan bergetar agar instruksi langsung terbaca.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-900 bg-slate-900/20 backdrop-blur-sm space-y-3 hover:border-slate-800 transition duration-150">
            <div className="text-indigo-400"><Link2 className="w-6 h-6" /></div>
            <h3 className="text-base font-bold text-slate-100 font-sans">Akses Instan Tanpa Login</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Bagikan tautan khusus peran kru via WhatsApp. Kru lapangan dan vendor bisa langsung memantau rundown tanpa repot mendaftar akun.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-900 bg-slate-900/20 backdrop-blur-sm space-y-3 hover:border-slate-800 transition duration-150">
            <div className="text-indigo-400"><WifiOff className="w-6 h-6" /></div>
            <h3 className="text-base font-bold text-slate-100 font-sans">Tetap Lancar Tanpa Sinyal</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sinyal mendadak hilang di ballroom? Jangan khawatir. Aplikasi otomatis menyimpan data terbaru agar hitung mundur rundown tetap berjalan presisi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
