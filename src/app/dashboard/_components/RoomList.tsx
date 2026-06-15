'use client';

import React, { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteRoomAction } from '@/app/actions/room';
import { Calendar, Trash2, CalendarDays, ArrowRight } from 'lucide-react';

interface Room {
  id: string;
  name: string;
  eventDate: string;
}

interface RoomListProps {
  initialRooms: Room[];
}

export default function RoomList({ initialRooms }: RoomListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus event "${name}"? Semua data rundown dan token akses akan dihapus permanen.`)) {
      return;
    }

    startTransition(async () => {
      const res = await deleteRoomAction(id);
      if (res?.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  };

  if (initialRooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl p-16 text-center bg-slate-900/10">
        <div className="mx-auto w-12 h-12 rounded-xl bg-slate-850 flex items-center justify-center text-slate-500 mb-4">
          <CalendarDays className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-300 font-sans">Belum Ada Event</h3>
        <p className="text-sm text-slate-500 max-w-sm mt-1 leading-relaxed">
          Buat event baru dengan mengklik tombol di atas untuk mulai menyusun rundown dan mengontrol D-Day.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {initialRooms.map((room) => {
        const formattedDate = new Date(room.eventDate).toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        return (
          <div
            key={room.id}
            className="flex flex-col justify-between border border-slate-900 bg-slate-900/20 rounded-2xl p-6 hover:border-slate-800 hover:bg-slate-900/40 transition-all duration-200"
          >
            <div>
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-bold text-lg text-white group-hover:text-indigo-400 transition duration-150 font-sans">
                  {room.name}
                </h3>
                <span className="shrink-0 text-xs px-2.5 py-0.5 rounded-full border border-slate-800 bg-slate-950 text-slate-400">
                  Room
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-2 flex items-center gap-1.5 font-mono">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>{formattedDate}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-900">
              <Link
                href={`/dashboard/rooms/${room.id}`}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-sm font-semibold rounded-xl text-center transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <span>Kelola Event</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => handleDelete(room.id, room.name)}
                disabled={isPending}
                className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/20 rounded-xl transition duration-150 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Hapus Event"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
