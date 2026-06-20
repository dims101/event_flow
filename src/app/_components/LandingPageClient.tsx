"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useSpring, useTransform } from "framer-motion";
import anime from "animejs";
import { Timer, MessageSquare, Link2, WifiOff, HelpCircle, ChevronDown, ArrowUpRight } from "lucide-react";
import { EventFlowLogo } from "@/components/EventFlowLogo";
import { Pricing } from "@/components/pricing";

interface PricingPlan {
  name: string;
  price: string;
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
  isPopular: boolean;
}

interface LandingPageClientProps {
  session?: string;
  plans: PricingPlan[];
  faqs: { question: string; answer: string }[];
}

export function LandingPageClient({ session, plans, faqs }: LandingPageClientProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const logoRef = useRef<HTMLDivElement>(null);

  // Check prefers-reduced-motion media query
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  // AnimeJS entrance animation for SVG logo paths
  useEffect(() => {
    if (prefersReducedMotion) return;

    // Trigger path entrance animations on load
    const anim = anime({
      targets: ".animate-logo-path path",
      opacity: [0, 1],
      scale: [0.85, 1],
      translateY: [24, 0],
      delay: anime.stagger(70, { start: 100 }),
      duration: 1200,
      easing: "cubicBezier(0.32, 0.72, 0, 1)",
    });

    return () => {
      anim.pause();
    };
  }, [prefersReducedMotion]);

  const { scrollY, scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const y1 = useTransform(scrollY, [0, 1000], [0, -150]);
  const y2 = useTransform(scrollY, [0, 1000], [0, 100]);
  const y3 = useTransform(scrollY, [0, 1000], [0, -80]);

  const glowY1 = prefersReducedMotion ? 0 : y1;
  const glowY2 = prefersReducedMotion ? 0 : y2;
  const glowY3 = prefersReducedMotion ? 0 : y3;

  // Framer Motion spring presets
  const easeTransition = { duration: 0.8, ease: [0.32, 0.72, 0, 1] as const };

  // Scroll entry variant
  const fadeUpVariant = prefersReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.4 } },
      }
    : {
        hidden: { opacity: 0, y: 32 },
        visible: { opacity: 1, y: 0, transition: easeTransition },
      };

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      const behavior = prefersReducedMotion ? "auto" : "smooth";
      element.scrollIntoView({ behavior });
      window.history.pushState(null, "", `#${targetId}`);
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start bg-[#050505] text-slate-100 overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* FAQ Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Scroll Progress Bar */}
      {!prefersReducedMotion && (
        <motion.div
          className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-400 origin-left z-55"
          style={{ scaleX, zIndex: 9999 }}
        />
      )}

      {/* 1. Cinematic Noise Overlay */}
      <div className="fixed inset-0 z-50 pointer-events-none opacity-[0.015] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />

      {/* 2. Ethereal Glass background glowing orbs with Parallax */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div style={{ y: glowY1 }} className="absolute -top-[20%] left-[10%] w-[80vw] h-[80vw] md:w-[60vw] md:h-[60vw] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.12)_0%,transparent_70%)] blur-[90px]" />
        <motion.div style={{ y: glowY2 }} className="absolute top-[25%] -right-[10%] w-[70vw] h-[70vw] md:w-[50vw] md:h-[50vw] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.08)_0%,transparent_70%)] blur-[90px]" />
        <motion.div style={{ y: glowY3 }} className="absolute bottom-[10%] -left-[20%] w-[80vw] h-[80vw] md:w-[50vw] md:h-[50vw] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.04)_0%,transparent_70%)] blur-[100px]" />
      </div>

      {/* 3. Floating Glass Island Navbar */}
      <header className="fixed top-0 left-1/2 -translate-x-1/2 mt-6 mx-auto w-[90%] max-w-5xl rounded-full bg-slate-950/65 border border-white/10 px-6 py-3.5 backdrop-blur-xl z-50 flex items-center justify-between shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]">
        <Link href="/" className="flex items-center gap-1.5 select-none transition-transform duration-300 hover:scale-[1.02]" aria-label="EventFlow Home">
          <EventFlowLogo className="h-6 md:h-7 w-auto" />
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-400">
          <a href="#features" onClick={(e) => handleScrollTo(e, "features")} className="hover:text-slate-100 transition-colors duration-200">Fitur</a>
          <a href="#pricing" onClick={(e) => handleScrollTo(e, "pricing")} className="hover:text-slate-100 transition-colors duration-200">Harga & Paket</a>
          <a href="#faq" onClick={(e) => handleScrollTo(e, "faq")} className="hover:text-slate-100 transition-colors duration-200">FAQ</a>
        </nav>

        {/* Action buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-bold text-slate-300 hover:text-slate-100 transition-colors duration-200"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="group relative inline-flex items-center gap-1 px-5 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-all duration-300 shadow-md hover:shadow-indigo-500/10 active:scale-[0.98]"
          >
            <span>Daftar Gratis</span>
            <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </span>
          </Link>
        </div>

        {/* Mobile menu hamburger morph trigger */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="relative md:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label={isMenuOpen ? "Tutup menu" : "Buka menu"}
        >
          <div className="relative w-5 h-3.5 flex flex-col justify-between">
            <span className={`w-full h-0.5 bg-slate-100 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] origin-left ${isMenuOpen ? "rotate-45 translate-x-[3px] -translate-y-[1px]" : ""}`} />
            <span className={`w-full h-0.5 bg-slate-100 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isMenuOpen ? "opacity-0 scale-0" : "opacity-100"}`} />
            <span className={`w-full h-0.5 bg-slate-100 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] origin-left ${isMenuOpen ? "-rotate-45 translate-x-[3px] translate-y-[1px]" : ""}`} />
          </div>
        </button>
      </header>

      {/* Mobile Menu Expansion Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={easeTransition}
            className="fixed inset-x-0 top-[90px] mx-auto w-[90%] rounded-3xl bg-slate-950/90 border border-white/10 p-6 backdrop-blur-2xl z-40 flex flex-col gap-4 shadow-2xl md:hidden"
          >
            <nav className="flex flex-col gap-4 text-base font-semibold text-slate-350">
              <a
                href="#features"
                onClick={(e) => {
                  setIsMenuOpen(false);
                  handleScrollTo(e, "features");
                }}
                className="px-4 py-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                Fitur
              </a>
              <a
                href="#pricing"
                onClick={(e) => {
                  setIsMenuOpen(false);
                  handleScrollTo(e, "pricing");
                }}
                className="px-4 py-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                Harga & Paket
              </a>
              <a
                href="#faq"
                onClick={(e) => {
                  setIsMenuOpen(false);
                  handleScrollTo(e, "faq");
                }}
                className="px-4 py-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                FAQ
              </a>
            </nav>
            <hr className="border-white/5 my-2" />
            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                onClick={() => setIsMenuOpen(false)}
                className="w-full py-3 text-center text-sm font-bold text-slate-300 hover:text-slate-100 hover:bg-white/5 rounded-xl transition-all"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                onClick={() => setIsMenuOpen(false)}
                className="w-full py-3 text-center text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg active:scale-[0.98]"
              >
                Daftar Gratis
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 w-full flex flex-col items-center">
        {/* 4. Hero Section */}
        <section className="relative min-h-[100dvh] flex flex-col items-center justify-center py-24 px-6 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariant}
            className="max-w-4xl w-full flex flex-col items-center space-y-10"
          >

            {/* Logo area */}
            <div ref={logoRef} className="relative w-full flex justify-center select-none mt-20 sm:mt-28 md:mt-32 py-6 animate-logo-path hero-logo">
              {/* Ethereal background glow behind the logo */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] sm:w-[100%] sm:h-[100%] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.16)_0%,rgba(168,85,247,0.1)_45%,transparent_80%)] blur-[60px] sm:blur-[90px] md:blur-[130px] pointer-events-none z-0" />
              
              <EventFlowLogo className="relative z-10 w-full max-w-[320px] sm:max-w-[440px] md:max-w-[560px] h-auto drop-shadow-[0_0_50px_rgba(99,102,241,0.2)]" />
            </div>

            {/* Subtext */}
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl leading-relaxed font-medium">
              Akhiri miskomunikasi dan jadwal molor. Orkestrasi *rundown* panggung secara *real-time*, kirim instruksi kilat ke seluruh kru, dan pastikan acara tetap berjalan sempurna meski koneksi internet terputus.
            </p>

            {/* Custom CTA pills with double bezel & nested trailing indicators */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 w-full max-w-md sm:max-w-2xl">
              <Link
                href={session ? "/dashboard" : "/register"}
                className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full transition-all duration-350 shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] whitespace-nowrap"
              >
                <span>{session ? "Mulai Orkestrasi" : "Mulai Gratis Sekarang"}</span>
                <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight className="w-4 h-4 text-white" strokeWidth={2.5} />
                </span>
              </Link>
              <a
                href="#pricing"
                onClick={(e) => handleScrollTo(e, "pricing")}
                className="w-full sm:w-auto px-8 py-4 bg-slate-900/60 border border-white/10 hover:bg-slate-800/80 text-slate-200 font-bold rounded-full transition-all duration-350 backdrop-blur-sm text-center active:scale-[0.98] whitespace-nowrap"
              >
                Lihat Paket Harga
              </a>
            </div>

            {/* Client Logo Strip */}
            <div className="pt-16 w-full flex flex-col items-center space-y-4 select-none">
              <span className="text-[10px] font-extrabold tracking-[0.2em] text-slate-500 uppercase text-center">
                Dipercaya oleh Show Caller & EO terkemuka untuk mengamankan jalannya acara
              </span>
              <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 text-sm font-extrabold text-slate-400 tracking-wider">
                <span className="opacity-40 transition-opacity hover:opacity-80">KARNIVAL</span>
                <span className="opacity-40 transition-opacity hover:opacity-80">NEXUS STAGE</span>
                <span className="opacity-40 transition-opacity hover:opacity-80">APEX CONCERTS</span>
                <span className="opacity-40 transition-opacity hover:opacity-80">VIBE PRODUCTIONS</span>
                <span className="opacity-40 transition-opacity hover:opacity-80">SOUNDWAVE</span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* 5. Bento Grid Features Section */}
        <section id="features" className="w-full max-w-6xl py-32 px-6 scroll-mt-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUpVariant}
            className="text-center space-y-4 mb-20"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/5 bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] select-none">
              Tinggalkan Cara Lama
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-100">
              Presisi Panggung Tanpa Kompromi
            </h2>
            <p className="text-slate-400 text-base max-w-lg mx-auto font-medium">
              Ucapkan selamat tinggal pada *rundown* kertas yang usang dan koordinasi HT yang berisik. EventFlow memberi Anda kendali penuh atas setiap detik acara.
            </p>
          </motion.div>

          {/* Asymmetrical Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
            
            {/* Card 1: Rundown Dinamis (col-span-8) */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeUpVariant}
              className="md:col-span-8 group relative"
            >
              {/* Double Bezel Outer Shell */}
              <div className="h-full bg-white/5 border border-white/10 rounded-[2.5rem] p-2 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-indigo-500/30">
                {/* Inner Content Core */}
                <div className="h-full bg-slate-950/80 border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[calc(2.5rem-0.5rem)] p-8 md:p-10 flex flex-col justify-between gap-8">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Timer className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-100">Rundown Tahan Banting</h3>
                    <p className="text-slate-400 text-sm md:text-base leading-relaxed font-medium">
                      Jadwal molor? Cukup geser durasi satu sesi, dan seluruh waktu panggung kru & vendor otomatis menyesuaikan secara *real-time*. Sinkronisasi seketika, tanpa miskomunikasi.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold tracking-wider uppercase select-none">
                    <span>Master Timer Sync</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 2: Prompter Saku Instan (col-span-4) */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeUpVariant}
              className="md:col-span-4 group relative"
            >
              <div className="h-full bg-white/5 border border-white/10 rounded-[2.5rem] p-2 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-indigo-500/30">
                <div className="h-full bg-slate-950/80 border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[calc(2.5rem-0.5rem)] p-8 flex flex-col justify-between gap-8">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <MessageSquare className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-100">Prompter Haptic Kilat</h3>
                    <p className="text-slate-400 text-sm leading-relaxed font-medium">
                      Kirim pesan krusial langsung ke layar kru tanpa repot berteriak di HT. Layar berkedip dan gawai bergetar, memastikan instruksi Anda terbaca detik itu juga.
                    </p>
                  </div>
                  <div className="text-indigo-400 text-xs font-bold tracking-wider uppercase select-none">
                    Haptic Alert Prompter
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 3: Akses Instan Tanpa Login (col-span-4) */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeUpVariant}
              className="md:col-span-4 group relative"
            >
              <div className="h-full bg-white/5 border border-white/10 rounded-[2.5rem] p-2 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-indigo-500/30">
                <div className="h-full bg-slate-950/80 border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[calc(2.5rem-0.5rem)] p-8 flex flex-col justify-between gap-8">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Link2 className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-100">Distribusi Tanpa Hambatan</h3>
                    <p className="text-slate-400 text-sm leading-relaxed font-medium">
                      Kru dan vendor tidak perlu instal aplikasi atau membuat akun. Cukup bagikan tautan via WhatsApp, dan mereka langsung terhubung ke *master timer* panggung.
                    </p>
                  </div>
                  <div className="text-indigo-400 text-xs font-bold tracking-wider uppercase select-none">
                    Quick Link Share
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 4: Tetap Lancar Tanpa Sinyal (col-span-8) */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeUpVariant}
              className="md:col-span-8 group relative"
            >
              <div className="h-full bg-white/5 border border-white/10 rounded-[2.5rem] p-2 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-indigo-500/30">
                <div className="h-full bg-slate-950/80 border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[calc(2.5rem-0.5rem)] p-8 md:p-10 flex flex-col justify-between gap-8">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <WifiOff className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-100">Anti-Gagal Meski Blank Spot</h3>
                    <p className="text-slate-400 text-sm md:text-base leading-relaxed font-medium">
                      Sinyal *ballroom* tiba-tiba hilang? Jangan panik. Arsitektur *offline-first* kami otomatis mengambil alih, memastikan hitung mundur panggung tetap berjalan 100% presisi tanpa jeda sedikit pun.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold tracking-wider uppercase select-none">
                    <span>Offline-First Engine</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </section>

        {/* Testimonials Section */}
        <section className="w-full max-w-6xl py-32 px-6 border-t border-white/5 scroll-mt-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUpVariant}
            className="text-center space-y-4 mb-20"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/5 bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] select-none">
              Bukti Nyata
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-100">
              Mengapa Profesional Mengandalkan EventFlow
            </h2>
            <p className="text-slate-400 text-base max-w-lg mx-auto font-medium">
              Jangan hanya percaya kata-kata kami. Lihat bagaimana Show Caller terbaik mengamankan acara mereka dari kekacauan teknis.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Testimonial 1 */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeUpVariant}
              className="group relative"
            >
              <div className="h-full bg-white/5 border border-white/10 rounded-[2.5rem] p-2 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-indigo-500/30">
                <div className="h-full bg-slate-950/80 border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[calc(2.5rem-0.5rem)] p-8 flex flex-col justify-between gap-6">
                  <p className="text-slate-300 text-sm leading-relaxed font-medium italic">
                    "Sejak beralih ke EventFlow, rasa cemas karena *delay* panggung hilang sepenuhnya. Sinkronisasi *master timer* membuat seluruh tim—dari visual hingga audio—bergerak sebagai satu kesatuan."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-extrabold text-sm font-mono select-none">
                      AW
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100">Andi Wijaya</h4>
                      <p className="text-xs text-slate-500 font-medium">Show Caller, Karnival Productions</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Testimonial 2 */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeUpVariant}
              className="group relative"
            >
              <div className="h-full bg-white/5 border border-white/10 rounded-[2.5rem] p-2 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-indigo-500/30">
                <div className="h-full bg-slate-950/80 border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[calc(2.5rem-0.5rem)] p-8 flex flex-col justify-between gap-6">
                  <p className="text-slate-300 text-sm leading-relaxed font-medium italic">
                    "Di *ballroom* yang sangat bising, HT sering tidak terdengar. Dengan Prompter Haptic, saya bisa mengirim instruksi krusial langsung ke saku MC. Begitu bergetar, mereka tahu apa yang harus dilakukan."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-extrabold text-sm font-mono select-none">
                      SA
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100">Sarah Amalia</h4>
                      <p className="text-xs text-slate-500 font-medium">Project Director, Nexus Stage</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Testimonial 3 */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeUpVariant}
              className="group relative"
            >
              <div className="h-full bg-white/5 border border-white/10 rounded-[2.5rem] p-2 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-indigo-500/30">
                <div className="h-full bg-slate-950/80 border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[calc(2.5rem-0.5rem)] p-8 flex flex-col justify-between gap-6">
                  <p className="text-slate-300 text-sm leading-relaxed font-medium italic">
                    "Mimpi buruk terbesar EO adalah sinyal hilang di dalam gedung. *Offline-first engine* EventFlow membuktikan ketangguhannya. Saat sinyal mati total, hitung mundur di puluhan gawai kru tetap berjalan presisi."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-extrabold text-sm font-mono select-none">
                      BS
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100">Budi Santoso</h4>
                      <p className="text-xs text-slate-500 font-medium">Technical Lead, Soundwave Indonesia</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 6. Pricing Section (Preserving existing Pricing component fully) */}
        <section id="pricing" className="relative w-full border-t border-slate-900/60 bg-slate-950/30 py-16 scroll-mt-24">
          <Pricing
            plans={plans}
            title="Investasi Tepat untuk Event Sempurna"
            description={`Pilih paket yang paling sesuai dengan skala EO Anda.\nSemua paket dilengkapi dengan fitur offline-first dan sinkronisasi real-time.`}
          />
        </section>

        {/* 7. FAQ Section */}
        <section id="faq" className="w-full max-w-4xl py-32 px-6 scroll-mt-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariant}
            className="text-center space-y-4 mb-20"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/5 bg-white/5 text-indigo-400 text-[10px] font-bold uppercase tracking-[0.2em] select-none">
              <HelpCircle className="w-3.5 h-3.5" />
              Pertanyaan Umum
            </div>
            <h3 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-100">
              Masih Bingung Memilih?
            </h3>
          </motion.div>

          {/* Interactive Accordion Accordion items with double bezel design */}
          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <motion.div
                  key={index}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={fadeUpVariant}
                  className="bg-white/5 border border-white/10 rounded-[1.75rem] p-1.5 transition-all duration-300 hover:border-indigo-500/20"
                >
                  <div className="bg-slate-950/80 border border-white/5 rounded-[calc(1.75rem-0.375rem)] overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="w-full flex items-center justify-between p-6 text-left font-bold text-slate-100 hover:text-indigo-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      aria-expanded={isOpen}
                    >
                      <span className="text-base md:text-lg pr-4">{faq.question}</span>
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 transition-transform duration-350">
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-180 text-indigo-400" : ""}`} />
                      </span>
                    </button>
                    
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key="content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] as const }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 text-sm md:text-base text-slate-400 leading-relaxed font-medium">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Bottom CTA Banner Section */}
        <section className="w-full max-w-5xl py-32 px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUpVariant}
            className="group relative"
          >
            {/* Double Bezel Glass Container */}
            <div className="bg-white/5 border border-white/10 rounded-[3rem] p-2 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-indigo-500/25">
              <div className="bg-slate-950/80 border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[calc(3rem-0.5rem)] p-12 md:p-16 text-center space-y-8 relative overflow-hidden">
                
                {/* Background ambient light inside the card */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06),transparent_60%)] pointer-events-none" />

                <div className="relative z-10 max-w-2xl mx-auto space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/10 bg-indigo-500/5 text-indigo-400 text-[10px] font-bold uppercase tracking-[0.2em] select-none">
                    Garansi Tanpa Risiko
                  </div>
                  <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-100">
                    Ambil Alih Kendali Panggung Anda, Hari Ini.
                  </h2>
                  <p className="text-slate-400 text-sm md:text-base leading-relaxed font-medium">
                    Tinggalkan kekacauan *rundown* manual. Mulai uji coba gratis Anda sekarang dan rasakan ketenangan pikiran dalam mengeksekusi setiap detik acara Anda.
                  </p>
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-sm mx-auto">
                  <Link
                    href={session ? "/dashboard" : "/register"}
                    className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full transition-all duration-350 shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98]"
                  >
                    <span>{session ? "Buka Dasbor" : "Mulai Uji Coba Gratis"}</span>
                    <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                      <ArrowUpRight className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </span>
                  </Link>
                  <Link
                    href="/login"
                    className="w-full sm:w-auto px-8 py-4 bg-slate-900/60 border border-white/10 hover:bg-slate-800/80 text-slate-200 font-bold rounded-full transition-all duration-350 backdrop-blur-sm text-center active:scale-[0.98]"
                  >
                    Masuk
                  </Link>
                </div>

                <p className="relative z-10 text-[10px] sm:text-xs text-slate-500 font-bold tracking-wide uppercase select-none">
                  Uji Coba Gratis 14 Hari &middot; Tanpa Kartu Kredit
                </p>

              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* 8. Premium Footer */}
      <footer className="relative w-full py-12 text-center text-xs text-slate-500 border-t border-white/5 bg-slate-950/90 z-20 flex flex-col items-center justify-center gap-4">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-semibold tracking-wider uppercase text-[10px] text-slate-500">
          <Link href="/docs" className="hover:text-white transition-colors">Dokumentasi</Link>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
          <Link href="/login" className="hover:text-white transition-colors">Masuk EO</Link>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
          <Link href="/register" className="hover:text-white transition-colors">Daftar EO</Link>
        </div>
        <p className="font-semibold tracking-wider uppercase text-[10px] text-slate-650">&copy; {new Date().getFullYear()} EventFlow. Semua hak dilindungi.</p>
      </footer>
    </div>
  );
}
