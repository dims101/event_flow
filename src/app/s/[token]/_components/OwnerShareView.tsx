'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getRundownItemsAction } from '@/app/actions/rundown';
import { Printer, Calendar, Clock, FileText } from 'lucide-react';

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

  // 1. Real-time Subscription via Supabase
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

  // Compute timing schedule dynamically using currentOffsetSeconds
  let accumulatedSeconds = room.currentOffsetSeconds;
  const timelineItems = items.map((item, index) => {
    const startTime = getFormattedTime(room.rundownStartTime, accumulatedSeconds);
    accumulatedSeconds += item.durationSeconds;
    const endTime = getFormattedTime(room.rundownStartTime, accumulatedSeconds);
    const isActive = room.currentRundownIndex === index;
    
    return {
      ...item,
      startTime,
      endTime,
      isActive,
    };
  });

  const activeItem = timelineItems.find((item) => item.isActive);

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
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-650 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-650/30">
              EF
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-sm text-slate-100">EventFlow</span>
              <span className="text-[10px] text-slate-400 block -mt-1 font-mono">Owner Portal</span>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition duration-150 flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 select-none"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8 print:p-0 print:space-y-6">
        {/* Document Brand Header for PDF (Shown ONLY on Print) */}
        <div className="hidden print:flex items-center justify-between border-b-2 border-black pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-black">{room.name}</h1>
            <p className="text-sm text-gray-700 font-mono mt-0.5">{formattedDate}</p>
          </div>
          <div className="text-right">
            <span className="text-xl font-black tracking-tight text-indigo-650">EventFlow</span>
            <span className="text-[10px] text-gray-500 font-mono block">Susunan Acara Resmi</span>
          </div>
        </div>

        {/* ── SCREEN VIEW: Premium Event Timeline (Hidden on Print) ── */}
        <div className="print:hidden space-y-8 animate-in fade-in duration-300">
          {/* Hero Welcome Card */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-900 bg-slate-900/30 backdrop-blur-md p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold font-mono">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formattedDate}</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight text-slate-100">{roomName}</h2>
              <p className="text-sm text-slate-400 font-medium">
                Selamat datang di portal susunan acara Anda. Jadwal di bawah ini disinkronkan secara langsung dengan aktivitas di lapangan.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950/60 border border-slate-850 font-mono text-sm text-slate-300">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Mulai: {room.rundownStartTime} WIB</span>
            </div>
          </div>

          {/* Active Highlight Banner */}
          {activeItem ? (
            <div className="border border-indigo-500/25 bg-indigo-950/15 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-indigo-500/5">
              <div className="flex items-center gap-3">
                <div className="relative flex h-3.5 w-3.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500"></span>
                </div>
                <div>
                  <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block font-mono">Sedang Berlangsung</span>
                  <h3 className="font-extrabold text-lg text-slate-100 mt-0.5">{activeItem.title}</h3>
                </div>
              </div>
              <div className="px-4 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 font-mono text-xs font-bold">
                {activeItem.startTime} - {activeItem.endTime} WIB ({activeItem.durationSeconds / 60}m)
              </div>
            </div>
          ) : (
            <div className="border border-slate-900 bg-slate-900/10 rounded-2xl p-5 flex items-center gap-3 text-slate-400">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-600 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Status Acara</span>
                <p className="text-sm font-semibold mt-0.5">
                  {room.currentRundownIndex >= timelineItems.length 
                    ? "Seluruh rangkaian acara telah selesai dilaksanakan." 
                    : "Menunggu rangkaian acara dimulai."}
                </p>
              </div>
            </div>
          )}

          {/* Interactive Timeline List */}
          <div className="relative pl-6 sm:pl-8 space-y-6">
            {/* Timeline Vertical Axis Line */}
            <div className="absolute left-[11px] sm:left-[15px] top-2 bottom-2 w-0.5 bg-slate-900" />

            {timelineItems.length === 0 ? (
              <div className="text-center py-12 text-slate-500 italic border border-dashed border-slate-900 rounded-2xl">
                Belum ada susunan acara yang terdaftar.
              </div>
            ) : (
              timelineItems.map((item, index) => {
                const isPast = room.currentRundownIndex > index;
                const isActive = item.isActive;

                return (
                  <div 
                    key={item.id}
                    className={`relative flex flex-col md:flex-row md:items-center gap-4 transition-all duration-300 ${
                      isPast ? 'opacity-40' : 'opacity-100'
                    }`}
                  >
                    {/* Timeline Node Dot */}
                    <div 
                      className={`absolute -left-[23px] sm:-left-[31px] w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                        isActive 
                          ? 'bg-indigo-650 border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]' 
                          : isPast 
                          ? 'bg-slate-950 border-slate-800' 
                          : 'bg-slate-950 border-slate-900'
                      }`}
                    >
                      {isActive && (
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white animate-pulse" />
                      )}
                    </div>

                    {/* Timeline Time Indicator */}
                    <div className="md:w-36 shrink-0">
                      <span className={`font-mono font-bold text-sm tracking-wide ${isActive ? 'text-indigo-400 font-extrabold' : 'text-slate-400'}`}>
                        {item.startTime} - {item.endTime} WIB
                      </span>
                    </div>

                    {/* Timeline Event Card */}
                    <div 
                      className={`flex-1 rounded-2xl p-5 border transition-all duration-250 ${
                        isActive 
                          ? 'bg-indigo-650/10 border-indigo-500/40 shadow-lg shadow-indigo-600/5' 
                          : 'bg-slate-900/20 border-slate-900/40 hover:border-slate-800/60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h4 className={`font-extrabold text-base ${isActive ? 'text-slate-100' : 'text-slate-200'}`}>
                          {item.title}
                        </h4>
                        <span className="text-xs font-mono font-bold text-slate-400 bg-slate-950 border border-slate-900 px-2.5 py-1 rounded-lg shrink-0 w-max">
                          Durasi: {item.durationSeconds / 60}m
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── PRINT VIEW: Clean Minimalist Table (Hidden on Screen) ── */}
        <div className="hidden print:block">
          <table className="w-full text-left border-collapse text-xs text-black border border-black">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-black">
                <th className="py-2.5 px-4 w-40 font-mono font-bold uppercase border-r border-black">Waktu (WIB)</th>
                <th className="py-2.5 px-4 font-bold uppercase border-r border-black">Agenda / Kegiatan</th>
                <th className="py-2.5 px-4 w-32 text-center font-bold uppercase">Durasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {timelineItems.map((item) => (
                <tr key={item.id} className={item.isActive ? "bg-gray-50" : ""}>
                  <td className="py-2.5 px-4 font-mono font-semibold border-r border-black">
                    {item.startTime} - {item.endTime}
                  </td>
                  <td className="py-2.5 px-4 font-bold border-r border-black">
                    {item.title}
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono font-semibold">
                    {item.durationSeconds / 60} menit
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Footer Print Helper (Hidden on Print) */}
        <footer className="text-center text-xs text-slate-500 py-6 font-mono print:hidden">
          Sinkronisasi real-time EventFlow • Gunakan tombol cetak di atas untuk mengekspor ke PDF.
        </footer>
      </main>
    </div>
  );
}
