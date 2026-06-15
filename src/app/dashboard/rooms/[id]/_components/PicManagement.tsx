'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addPicAction, deletePicAction } from '@/app/actions/pic';
import { Plus, Trash2, Shield, User } from 'lucide-react';

interface Pic {
  id: string;
  roomId: string;
  name: string;
}

interface PicManagementProps {
  roomId: string;
  initialPics: Pic[];
}

export default function PicManagement({ roomId, initialPics }: PicManagementProps) {
  const router = useRouter();
  const [picsList, setPicsList] = useState<Pic[]>(initialPics);
  const [newPicName, setNewPicName] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Sync state if initialPics props change
  React.useEffect(() => {
    setPicsList(initialPics);
  }, [initialPics]);

  const handleAddPic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPicName.trim()) return;

    setError(null);
    startTransition(async () => {
      const res = await addPicAction(roomId, newPicName.trim());
      if (res.error) {
        setError(res.error);
      } else {
        setNewPicName('');
        router.refresh();
      }
    });
  };

  const handleDeletePic = async (id: string, name: string) => {
    if (['MC', 'MUA', 'Fotografer'].includes(name)) {
      if (!confirm(`"${name}" adalah PIC bawaan sistem. Apakah Anda yakin ingin menghapusnya?`)) {
        return;
      }
    } else {
      if (!confirm(`Hapus PIC "${name}"?`)) return;
    }

    startTransition(async () => {
      const res = await deletePicAction(id);
      if (res.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-900/40 rounded-xl p-6 space-y-4">
      <h3 className="text-base font-bold text-slate-100 font-sans flex items-center gap-2">
        <User className="w-5 h-5 text-indigo-400" />
        <span>Kelola PIC Acara</span>
      </h3>

      {error && (
        <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Add PIC Form */}
      <form onSubmit={handleAddPic} className="flex gap-2">
        <input
          type="text"
          value={newPicName}
          onChange={(e) => setNewPicName(e.target.value)}
          placeholder="Nama PIC baru (cth: MUA 2)"
          maxLength={30}
          required
          className="flex-1 px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs"
        />
        <button
          type="submit"
          disabled={isPending}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-lg transition duration-150 flex items-center justify-center cursor-pointer select-none"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>

      {/* PIC List */}
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {picsList.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Belum ada PIC terdaftar.</p>
        ) : (
          picsList.map((pic) => {
            const isDefault = ['MC', 'MUA', 'Fotografer'].includes(pic.name);
            return (
              <div
                key={pic.id}
                className="flex items-center justify-between p-2 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-950/80 transition duration-100 text-xs"
              >
                <div className="flex items-center gap-2 text-slate-200">
                  <span>{pic.name}</span>
                  {isDefault && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-0.5 font-bold tracking-wider uppercase font-mono">
                      <Shield className="w-2.5 h-2.5" />
                      Default
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDeletePic(pic.id, pic.name)}
                  disabled={isPending}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition duration-150 cursor-pointer"
                  title="Hapus PIC"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
