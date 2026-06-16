'use client';

import React, { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { loginAction } from '@/app/actions/auth';
import { AlertCircle, LogIn, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check reduced motion support
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    const parsedEmail = formData.get('email')?.toString().trim();
    if (parsedEmail) {
      formData.set('email', parsedEmail);
    }

    startTransition(async () => {
      const res = await loginAction(null, formData);
      if (res?.error) {
        setError(res.error);
      } else if (res?.success) {
        window.location.href = '/dashboard';
      }
    });
  };

  const easeTransition = { duration: 0.8, ease: [0.32, 0.72, 0, 1] as const };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#050505] text-slate-100 px-4 overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* 1. Cinematic Noise Overlay */}
      <div className="fixed inset-0 z-50 pointer-events-none opacity-[0.015] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />

      {/* 2. Ethereal Glass background glowing orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[30%] left-[10%] w-[90vw] h-[90vw] md:w-[60vw] md:h-[60vw] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.12)_0%,transparent_70%)] blur-[95px]" />
        <div className="absolute bottom-[10%] -right-[10%] w-[80vw] h-[80vw] md:w-[50vw] md:h-[50vw] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.08)_0%,transparent_70%)] blur-[90px]" />
      </div>

      {/* 3. Concentric Double-Bezel Card Envelope */}
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={easeTransition}
        className="relative z-10 w-full max-w-md bg-white/5 border border-white/10 rounded-[2.5rem] p-2 shadow-2xl transition-all duration-550 hover:border-indigo-500/20"
      >
        <div className="bg-slate-950/80 border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[calc(2.5rem-0.5rem)] p-8 md:p-10 flex flex-col gap-6">
          
          <div className="space-y-3 text-center mb-4">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2">
              <LogIn className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 font-sans">
              Masuk ke EventFlow
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              Kendalikan rundown dan koordinasi tim lapangan hari ini.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" strokeWidth={2} />
              <div className="flex-1 font-medium">
                <span className="font-bold block mb-0.5">Ada masalah saat masuk</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
                Alamat Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="nama@perusahaan.com…"
                autoComplete="username"
                spellCheck={false}
                className="w-full px-4 py-3 rounded-full border border-white/10 bg-slate-950/80 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition duration-300 text-sm font-medium"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
                Kata Sandi
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-full border border-white/10 bg-slate-950/80 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition duration-300 text-sm font-medium"
              />
            </div>

            {/* Button-in-Button Submit pill */}
            <button
              type="submit"
              disabled={isPending}
              className="group relative w-full inline-flex items-center justify-center gap-3 px-6 py-4 font-bold bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-full transition-all duration-300 active:scale-[0.98] cursor-pointer shadow-lg hover:shadow-indigo-500/20"
            >
              {isPending ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk Aplikasi</span>
                  <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5">
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </span>
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-slate-400 font-medium">
            Belum memiliki akun?{' '}
            <Link href="/register" className="text-indigo-400 hover:text-indigo-350 font-bold transition-colors">
              Daftar di sini
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
