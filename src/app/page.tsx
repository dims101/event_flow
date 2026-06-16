import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LandingPageClient } from "./_components/LandingPageClient";

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
    <LandingPageClient
      session={session}
      plans={eventFlowPlans}
      faqs={faqs}
    />
  );
}
