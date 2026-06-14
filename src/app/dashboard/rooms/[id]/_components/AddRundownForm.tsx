'use client';

import React, { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { addRundownItemAction } from '@/app/actions/rundown';

interface AddRundownFormProps {
  roomId: string;
}

export default function AddRundownForm({ roomId }: AddRundownFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const res = await addRundownItemAction(null, formData);
      if (res?.error) {
        setError(res.error);
      } else if (res?.success) {
        formRef.current?.reset();
        router.refresh();
      }
    });
  };

  return (
    <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 backdrop-blur-sm">
      <h3 className="text-lg font-bold text-white mb-4">Tambah Sesi Rundown</h3>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
          ⚠️ {error}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="roomId" value={roomId} />

        <div className="space-y-1">
          <label htmlFor="title" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Nama Sesi / Kegiatan
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="e.g. Sambutan Pihak Keluarga"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition duration-150 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="durationMinutes" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Durasi (Menit)
            </label>
            <input
              id="durationMinutes"
              name="durationMinutes"
              type="number"
              min="1"
              required
              placeholder="e.g. 15"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition duration-150 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="targetRole" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Target Divisi / Peran
            </label>
            <select
              id="targetRole"
              name="targetRole"
              required
              className="w-full px-4 py-2.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 focus:outline-none focus:border-indigo-500 transition duration-150 text-sm appearance-none"
            >
              <option value="All">Semua Kru (All)</option>
              <option value="MC">Master of Ceremony (MC)</option>
              <option value="Catering">Katering (Catering)</option>
              <option value="MUA">Make-Up Artist (MUA)</option>
              <option value="Dokumentasi">Dokumentasi (Foto/Video)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-sm font-semibold rounded-lg transition duration-150 flex items-center justify-center gap-2 mt-2"
        >
          {isPending && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          <span>Tambah ke Rundown</span>
        </button>
      </form>
    </div>
  );
}
