'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, Check, X, Loader2 } from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';

export function LogoutButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Close modal on Escape key press
  useEffect(() => {
    if (!showConfirm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowConfirm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showConfirm]);

  const handleLogout = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-slate-100 bg-slate-900 hover:bg-slate-800 border border-slate-850 rounded-lg transition duration-150 flex items-center gap-1.5 cursor-pointer min-h-[38px]"
      >
        <LogOut className="w-4 h-4" />
        <span>Keluar</span>
      </button>

      {showConfirm && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Backdrop click to close */}
          <div 
            className="absolute inset-0" 
            onClick={() => { if (!isPending) setShowConfirm(false); }} 
          />
          
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-100 z-10">
            {/* Modal Icon & Header */}
            <div className="flex flex-col items-center text-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <LogOut className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold tracking-tight">Konfirmasi Keluar</h3>
              <p className="text-slate-400 text-sm">
                Apakah Anda yakin ingin keluar dari dashboard? Anda perlu login kembali untuk mengakses rundown event.
              </p>
            </div>

            {/* Modal Action Buttons */}
            <form onSubmit={handleLogout} className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 px-4 text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 rounded-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer min-h-[40px]"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Ya, Keluar</span>
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setShowConfirm(false)}
                className="w-full py-2.5 px-4 text-sm font-semibold text-slate-300 hover:text-white bg-slate-850 hover:bg-slate-800 disabled:text-slate-500 rounded-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer min-h-[40px]"
              >
                <X className="w-4 h-4" />
                <span>Batal</span>
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
