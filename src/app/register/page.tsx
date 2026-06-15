'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { registerAction } from '@/app/actions/auth';
import { AlertCircle, UserPlus } from 'lucide-react';

export default function Register() {
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
      const res = await registerAction(null, formData);
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.1),transparent_50%)]" />

      <div className="relative z-10 w-full max-w-md bg-slate-900/50 border border-slate-900 rounded-2xl p-8 backdrop-blur-md shadow-2xl">
        <div className="space-y-2 text-center mb-8">
          <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent font-sans">
            Daftar EventFlow
          </h1>
          <p className="text-slate-400 text-sm">
            Buat akun EO/WO Anda untuk mengelola rundown Hari-H
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm flex items-start gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label htmlFor="companyName" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Nama Perusahaan / EO
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              required
              placeholder="e.g. Dream Weddings"
              className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-150 text-base"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Alamat Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="name@company.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-150 text-base"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Kata Sandi
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-150 text-base"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold rounded-xl transition duration-150 mt-4 flex items-center justify-center cursor-pointer min-h-[48px]"
          >
            {isPending ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Daftar Sekarang'
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold underline">
            Masuk disini
          </Link>
        </div>
      </div>
    </div>
  );
}
