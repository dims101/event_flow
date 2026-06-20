'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getRundownItemsAction } from '@/app/actions/rundown';
import { getRoleBadgeStyle } from '@/lib/picColors';
import { Printer, Calendar, Clock, FileText } from 'lucide-react';
import { EventFlowLogo } from '@/components/EventFlowLogo';

interface RundownItem {
  id: string;
  title: string;
  durationSeconds: number;
  targetRole: string;
  targetPics?: string | null;
  orderIndex: number;
}

interface Room {
  id: string;
  name: string;
  eventDate: string;
  rundownStartTime: string;
  currentOffsetSeconds: number;
  currentRundownIndex: number;
  timerStatus: string;
}

interface OwnerShareViewProps {
  roomId: string;
  roomName: string;
  token: string;
  initialRoom: Room;
  initialItems: RundownItem[];
}

const mapRoom = (dbRoom: any): Room => {
  if (!dbRoom) return dbRoom;
  return {
    id: dbRoom.id,
    name: dbRoom.name,
    eventDate: dbRoom.event_date || dbRoom.eventDate,
    rundownStartTime: dbRoom.rundown_start_time || dbRoom.rundownStartTime || '08:00',
    currentOffsetSeconds: dbRoom.current_offset_seconds !== undefined ? dbRoom.current_offset_seconds : dbRoom.currentOffsetSeconds,
    currentRundownIndex: dbRoom.current_rundown_index !== undefined ? dbRoom.current_rundown_index : dbRoom.currentRundownIndex,
    timerStatus: dbRoom.timer_status || dbRoom.timerStatus,
  };
};

const mapRundownItem = (dbItem: any): RundownItem => {
  return {
    id: dbItem.id,
    title: dbItem.title,
    durationSeconds: dbItem.duration_seconds !== undefined ? dbItem.duration_seconds : dbItem.durationSeconds,
    targetRole: dbItem.target_role || dbItem.targetRole,
    targetPics: dbItem.target_pics !== undefined ? dbItem.target_pics : dbItem.targetPics,
    orderIndex: dbItem.order_index !== undefined ? dbItem.order_index : dbItem.orderIndex,
  };
};

export default function OwnerShareView({
  roomId,
  roomName,
  initialRoom,
  initialItems,
}: OwnerShareViewProps) {
  const [room, setRoom] = useState<Room>(mapRoom(initialRoom));
  const [items, setItems] = useState<RundownItem[]>(initialItems.map(mapRundownItem));

  // Force Light Mode only (disable dark mode variables) on mount
  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains('dark');
    
    html.classList.remove('dark');
    html.style.colorScheme = 'light';
    
    return () => {
      if (hadDark) {
        html.classList.add('dark');
        html.style.colorScheme = 'dark';
      }
    };
  }, []);

  // 1. Real-time Subscription via Supabase (Updates preview if the EO modifies items live during meeting)
  useEffect(() => {
    const roomChannel = supabase
      .channel(`owner-room-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          if (payload.new) {
            setRoom(mapRoom(payload.new));
          }
        }
      )
      .subscribe();

    const rundownChannel = supabase
      .channel(`owner-rundown-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rundown_items', filter: `room_id=eq.${roomId}` },
        async () => {
          const updatedItems = await getRundownItemsAction(roomId);
          if (updatedItems) {
            setItems(updatedItems.map(mapRundownItem));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(rundownChannel);
    };
  }, [roomId]);

  // 2. Helper to compute wall-clock times
  const getFormattedTime = (baseTimeStr: string, accumulatedSeconds: number) => {
    const [hours, minutes] = baseTimeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    date.setSeconds(date.getSeconds() + accumulatedSeconds);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Compute timing schedule dynamically using room properties
  let accumulatedSeconds = 0; // Pre-event planning has no live offset, start clean
  const timelineItems = items.map((item) => {
    const startTime = getFormattedTime(room.rundownStartTime, accumulatedSeconds);
    accumulatedSeconds += item.durationSeconds;
    const endTime = getFormattedTime(room.rundownStartTime, accumulatedSeconds);
    
    return {
      ...item,
      startTime,
      endTime,
    };
  });

  // Calculate event stats
  const totalDurationMinutes = items.reduce((acc, item) => acc + (item.durationSeconds / 60), 0);
  const hours = Math.floor(totalDurationMinutes / 60);
  const mins = totalDurationMinutes % 60;
  const durationText = hours > 0 ? `${hours} jam ${mins > 0 ? `${mins} menit` : ''}` : `${mins} menit`;

  const formattedDate = new Date(room.eventDate).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 print:bg-white print:text-black font-sans transition-colors duration-150">
      {/* Top Header Navigation (Hidden on Print) */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <EventFlowLogo className="h-6 w-auto text-slate-100" />
            <div className="border-l border-slate-800 pl-2.5">
              <span className="text-[10px] text-slate-400 block font-mono leading-none">Owner Portal</span>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition duration-150 flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 select-none"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8 print:py-6 print:px-0">
        {/* Hero Welcome Card */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-900 bg-slate-900/30 backdrop-blur-md p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold font-mono">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formattedDate}</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight text-slate-100">{roomName}</h2>
              <p className="text-sm text-slate-400 max-w-xl">
                Berikut adalah susunan rancangan rundown untuk acara Anda. Perubahan jadwal yang disepakati akan ter-update di sini secara langsung.
              </p>
            </div>

            {/* Event Metadata Cards */}
            <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
              <div className="bg-slate-950/60 border border-slate-850 p-3.5 rounded-2xl flex flex-col justify-center min-w-[120px]">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Waktu Mulai</span>
                <span className="text-sm font-extrabold text-slate-200 mt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  {room.rundownStartTime}
                </span>
              </div>
              <div className="bg-slate-950/60 border border-slate-850 p-3.5 rounded-2xl flex flex-col justify-center min-w-[120px]">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Total Durasi</span>
                <span className="text-sm font-extrabold text-slate-200 mt-1">
                  {durationText}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Rundown Table Container */}
        <div className="bg-slate-900 border border-slate-900/40 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4.5 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-slate-100 font-sans flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Rencana Susunan Sesi ({items.length} Sesi)</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-mono text-xs uppercase tracking-wider">
                  <th className="py-4 px-6 w-44">Waktu</th>
                  <th className="py-4 px-6">Agenda / Kegiatan</th>
                  <th className="py-4 px-6 w-24 text-center">Durasi</th>
                  <th className="py-4 px-6 w-56 text-right">Penanggung Jawab (PIC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {timelineItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 italic">
                      Belum ada sesi rundown yang ditambahkan ke event ini.
                    </td>
                  </tr>
                ) : (
                  timelineItems.map((item) => (
                    <tr 
                      key={item.id}
                      className="hover:bg-slate-950/10 transition-colors duration-100 text-slate-300"
                    >
                      <td className="py-4 px-6 font-semibold font-mono text-indigo-400">
                        {item.startTime} - {item.endTime}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold">{item.title}</div>
                      </td>
                      <td className="py-4 px-6 text-center font-mono font-bold text-slate-400">
                        {item.durationSeconds / 60}m
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex flex-wrap gap-1 justify-end">
                          {item.targetPics ? (
                            JSON.parse(item.targetPics).map((pic: string) => (
                              <span 
                                key={pic}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getRoleBadgeStyle(pic)}`}
                              >
                                {pic}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500">All</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Footer Print Helper (Hidden on Print) */}
        <footer className="text-center text-xs text-slate-500 py-6 font-mono print:hidden">
          Proposal Rundown Real-Time • Gunakan tombol cetak di atas untuk mengekspor ke PDF.
        </footer>
      </main>
    </div>
  );
}
