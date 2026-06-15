'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { loginAction } from '@/app/actions/auth';
import { AlertCircle, LogIn } from 'lucide-react';

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(12,102,228,0.08),transparent_50%)]" />

      <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-900/40 rounded-xl p-8 shadow-lg">
        <div className="space-y-2 text-center mb-8">
          <div className="mx-auto w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2">
            <LogIn className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">
            Masuk ke EventFlow
          </h1>
          <p className="text-slate-400 text-sm">
            Kendalikan rundown dan koordinasi tim lapangan hari ini.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-sm flex items-start gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Ada masalah saat masuk</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-bold text-slate-400 tracking-wide">
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
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-150 text-base"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-bold text-slate-400 tracking-wide">
              Kata Sandi
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-150 text-base"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold rounded-lg transition duration-150 mt-4 flex items-center justify-center cursor-pointer min-h-[40px] select-none"
          >
            {isPending ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Masuk Aplikasi'
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-400">
          Belum memiliki akun?{' '}
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">
            Daftar di sini
          </Link>
        </div>
      </div>
    </div>
  );
}
