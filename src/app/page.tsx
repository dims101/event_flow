import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LandingPageClient } from "./_components/LandingPageClient";

const eventFlowPlans = [
  {
    name: "FREE",
    price: "0",
    yearlyPrice: "0",
    period: "per month",
    features: [
      "1 Kredit Acara dasar per bulan",
      "Maksimal 5 perangkat kru terhubung",
      "Maksimal 8 sesi rundown acara",
      "Tautan pantau acak (Ugly Slug URL)",
      "Catatan aktivitas (Audit Log) terkunci",
    ],
    description: "Untuk Wedding Organizer pemula atau event skala kecil.",
    buttonText: "Mulai Gratis",
    href: "/register",
    isPopular: false,
  },
  {
    name: "PLUS",
    price: "199000",
    yearlyPrice: "2189000",
    period: "per month",
    features: [
      "5 Kredit Acara per bulan (4 Premium + 1 Free)",
      "Kredit Premium akumulatif (Rollover tahunan)",
      "Maksimal 12 perangkat kru terhubung",
      "Maksimal 20 sesi rundown acara",
      "Tautan kustom elegan (Vanity URL) & password",
      "Catatan aktivitas (Audit Log) terbuka",
    ],
    description: "Cocok untuk Wedding Organizer aktif & event menengah.",
    buttonText: "Pilih Paket Plus",
    href: "/register",
    isPopular: false,
  },
  {
    name: "PRO",
    price: "399000",
    yearlyPrice: "4389000",
    period: "per month",
    features: [
      "10 Kredit Acara per bulan (9 Premium + 1 Free)",
      "Kredit Premium akumulatif (Rollover tahunan)",
      "Maksimal 20 perangkat kru terhubung",
      "Maksimal 40 sesi rundown acara",
      "Akses layar monitor panggung (maks 3 layar)",
      "Kustomisasi identitas visual (Logo & Warna)",
    ],
    description: "Pilihan terbaik untuk Event Organizer profesional.",
    buttonText: "Langganan Pro",
    href: "/register",
    isPopular: true,
  },
  {
    name: "ENTERPRISE",
    price: "833000",
    yearlyPrice: "9999000",
    period: "per month",
    features: [
      "50 Kredit Acara per bulan (49 Premium + 1 Free)",
      "Kredit Premium akumulatif (Rollover otomatis)",
      "Maksimal 100 perangkat kru terhubung",
      "Sesi rundown tidak terbatas (Unlimited)",
      "Akses layar monitor panggung (maks 10 layar)",
      "Branding kustom penuh (Logo, Warna, Font, BG)",
    ],
    description: "Untuk penyelenggara acara berskala besar dan promotor.",
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
    <LandingPageClient
      session={session}
      plans={eventFlowPlans}
      faqs={faqs}
    />
  );
}
