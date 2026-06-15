'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteRundownItemAction } from '@/app/actions/rundown';
import { Trash2, Clock, ClipboardList } from 'lucide-react';

interface RundownItem {
  id: string;
  roomId: string;
  title: string;
  durationSeconds: number;
  targetRole: string;
  targetPics?: string | null;
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
    case 'Fotografer':
      return 'border-blue-500/20 bg-blue-500/10 text-blue-400';
    default:
      return 'border-slate-800 bg-slate-900 text-slate-400';
  }
};

const renderPicBadges = (item: RundownItem) => {
  let list: string[] = [];
  if (item.targetPics) {
    try {
      list = JSON.parse(item.targetPics);
    } catch (e) {
      list = item.targetRole ? item.targetRole.split(', ') : ['All'];
    }
  } else {
    list = item.targetRole ? item.targetRole.split(', ') : ['All'];
  }

  return (
    <div className="flex flex-wrap gap-1">
      {list.map((pic) => (
        <span
          key={pic}
          className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold ${getRoleBadgeStyle(pic)}`}
        >
          {pic}
        </span>
      ))}
    </div>
  );
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
      <div className="flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl p-12 text-center bg-slate-900/5 animate-in fade-in duration-200">
        <div className="mx-auto w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
          <ClipboardList className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-300 font-sans">Rundown masih kosong</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
          Belum ada jadwal kegiatan yang ditambahkan. Gunakan formulir di sebelah kanan untuk menambahkan sesi acara pertama Anda.
        </p>
      </div>
    );
  }

  // Calculate cumulative times
  let accumulatedMinutes = 0;

  const formatOffset = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `+${h > 0 ? `${h}j ` : ''}${m}m`;
  };

  return (
    <div className="space-y-4">
      {/* MOBILE LIST VIEW (hidden on desktop) */}
      <div className="block sm:hidden space-y-3">
        {items.map((item, index) => {
          const durationMinutes = item.durationSeconds / 60;
          const startOffset = accumulatedMinutes;
          accumulatedMinutes += durationMinutes;

          return (
            <div
              key={item.id}
              className="border border-slate-900/40 bg-slate-900 rounded-xl p-4 space-y-3 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-500 font-bold">#{index + 1}</span>
                    <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-900/60">
                      Mulai {formatOffset(startOffset)}
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-200 text-sm leading-snug">{item.title}</h5>
                </div>
                <button
                  onClick={() => handleDelete(item.id, item.title)}
                  disabled={isPending}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition duration-150 min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                  title="Hapus Sesi"
                  aria-label={`Hapus Sesi ${item.title}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-900/40 text-xs">
                {renderPicBadges(item)}
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{durationMinutes} Menit</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP TABLE VIEW (hidden on mobile) */}
      <div className="hidden sm:block border border-slate-900/40 bg-slate-900 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-900/40 bg-slate-900/30 text-slate-400 text-[10px] font-bold uppercase tracking-wider select-none">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Sesi / Kegiatan</th>
                <th className="py-3 px-4 w-28 text-center">Durasi</th>
                <th className="py-3 px-4 w-32">Kru Target</th>
                <th className="py-3 px-4 w-24 text-center">Est. Mulai</th>
                <th className="py-3 px-4 w-12 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/30 text-sm">
              {(() => {
                let tableStartOffset = 0;
                return items.map((item, index) => {
                  const durationMinutes = item.durationSeconds / 60;
                  const currentOffset = tableStartOffset;
                  tableStartOffset += durationMinutes;

                  return (
                    <tr key={item.id} className="hover:bg-slate-900/40 transition duration-100">
                      <td className="py-3 px-4 text-center text-slate-500 font-mono text-xs tabular-nums">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-200">
                        {item.title}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-300 tabular-nums">
                        {durationMinutes} Menit
                      </td>
                      <td className="py-3 px-4">
                        {renderPicBadges(item)}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs tabular-nums">
                        {formatOffset(currentOffset)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDelete(item.id, item.title)}
                          disabled={isPending}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition duration-150 cursor-pointer min-h-[32px] min-w-[32px] inline-flex items-center justify-center select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                          title="Hapus Sesi"
                          aria-label={`Hapus Sesi ${item.title}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
