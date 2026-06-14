'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteRundownItemAction } from '@/app/actions/rundown';

interface RundownItem {
  id: string;
  roomId: string;
  title: string;
  durationSeconds: number;
  targetRole: string;
  orderIndex: number;
}

interface RundownTableProps {
  items: RundownItem[];
}

const getRoleBadgeStyle = (role: string) => {
  switch (role) {
    case 'All':
      return 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400';
    case 'MC':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-400';
    case 'Catering':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400';
    case 'MUA':
      return 'border-purple-500/20 bg-purple-500/10 text-purple-400';
    case 'Dokumentasi':
      return 'border-blue-500/20 bg-blue-500/10 text-blue-400';
    default:
      return 'border-slate-800 bg-slate-900 text-slate-400';
  }
};

export default function RundownTable({ items }: RundownTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Hapus sesi "${title}" dari rundown?`)) return;

    startTransition(async () => {
      const res = await deleteRundownItemAction(id);
      if (res?.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center border border-slate-900 rounded-2xl p-12 text-center bg-slate-900/10">
        <span className="text-3xl mb-2">📝</span>
        <h4 className="text-sm font-semibold text-slate-400">Rundown Kosong</h4>
        <p className="text-xs text-slate-500 mt-1">
          Belum ada jadwal yang dimasukkan. Silakan tambahkan sesi pertama di form samping.
        </p>
      </div>
    );
  }

  // Calculate cumulative times
  let accumulatedMinutes = 0;

  return (
    <div className="border border-slate-900 bg-slate-900/10 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-900 bg-slate-900/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <th className="py-3.5 px-4 w-12 text-center">No</th>
              <th className="py-3.5 px-4">Sesi / Kegiatan</th>
              <th className="py-3.5 px-4 w-28 text-center">Durasi</th>
              <th className="py-3.5 px-4 w-32">Kru Target</th>
              <th className="py-3.5 px-4 w-24 text-center">Est. Mulai</th>
              <th className="py-3.5 px-4 w-12 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/50 text-sm">
            {items.map((item, index) => {
              const durationMinutes = item.durationSeconds / 60;
              const startOffset = accumulatedMinutes;
              accumulatedMinutes += durationMinutes;

              const formatOffset = (mins: number) => {
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                return `+${h > 0 ? `${h}j ` : ''}${m}m`;
              };

              return (
                <tr key={item.id} className="hover:bg-slate-900/20 transition duration-150">
                  <td className="py-3.5 px-4 text-center text-slate-500 font-mono">
                    {index + 1}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-200">
                    {item.title}
                  </td>
                  <td className="py-3.5 px-4 text-center font-medium text-slate-300">
                    {durationMinutes} Menit
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full border text-xs font-medium ${getRoleBadgeStyle(item.targetRole)}`}>
                      {item.targetRole}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-xs">
                    {formatOffset(startOffset)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      disabled={isPending}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition duration-150"
                      title="Hapus Sesi"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
