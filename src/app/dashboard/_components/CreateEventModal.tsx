'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createRoomAction } from '@/app/actions/room';
import { X, AlertCircle, Calendar } from 'lucide-react';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateEventModal({ isOpen, onClose }: CreateEventModalProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const res = await createRoomAction(null, formData);
      if (res?.error) {
        setError(res.error);
      } else if (res?.success) {
        onClose();
        router.refresh();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white font-sans">Buat Event Baru</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition duration-150 p-2 rounded-lg hover:bg-slate-800 flex items-center justify-center cursor-pointer min-h-[40px] min-w-[40px]"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs flex items-start gap-1.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="name" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Nama Event / Acara
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Wedding of Rian & Sinta"
              className="w-full px-4 py-3 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition duration-150 text-base"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="eventDate" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Tanggal Pelaksanaan
            </label>
            <div className="relative">
              <input
                id="eventDate"
                name="eventDate"
                type="date"
                required
                className="w-full px-4 py-3 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:outline-none focus:border-indigo-500 transition duration-150 text-base appearance-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition duration-150 cursor-pointer min-h-[38px]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-sm font-semibold rounded-lg transition duration-150 flex items-center gap-2 cursor-pointer min-h-[38px]"
            >
              {isPending && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>Buat Event</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
