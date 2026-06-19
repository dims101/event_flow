'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getRundownItemsAction } from '@/app/actions/rundown';
import { getRoleBadgeStyle } from '@/lib/picColors';
import { Printer, Calendar, Clock, FileText, Share2 } from 'lucide-react';

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
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-650 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-650/30">
              EF
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-sm text-slate-100">EventFlow</span>
              <span className="text-[10px] text-slate-400 block -mt-1 font-mono">Client View Portal</span>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition duration-150 flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 select-none"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Rundown / PDF</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8 print:p-0 print:space-y-6">
        {/* Document Brand Header for PDF (Shown ONLY on Print) */}
        <div className="hidden print:flex items-center justify-between border-b-2 border-black pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-black">{room.name}</h1>
            <p className="text-sm text-gray-700 font-mono mt-0.5">{formattedDate}</p>
          </div>
          <div className="text-right">
            <span className="text-xl font-black tracking-tight text-indigo-600">EventFlow</span>
            <span className="text-[10px] text-gray-500 font-mono block">Dibuat Otomatis • Tanpa Kertas</span>
          </div>
        </div>

        {/* Live Banner (Hidden on Print) */}
        <div className="border border-slate-900/60 bg-slate-900/30 backdrop-blur-sm rounded-2xl p-6 print:hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">Status Live Panggung</span>
            <h2 className="text-2xl font-black text-slate-100">{roomName}</h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-400 mt-2 font-mono">
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-500" /> {formattedDate}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-500" /> Mulai: {room.rundownStartTime} WIB</span>
            </div>
          </div>

          {/* Big Active Session Visual Indicator */}
          <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 md:w-80 flex items-center gap-4">
            <div className="relative flex h-3 w-3 shrink-0">
              {room.timerStatus === 'running' ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-mono">Sesi Aktif Sekarang</span>
              <p className="font-extrabold text-sm text-slate-100 truncate mt-0.5">
                {activeItem ? activeItem.title : 'Belum Mulai'}
              </p>
              {activeItem && (
                <span className="text-xs text-indigo-400 font-mono mt-0.5 block">
                  {activeItem.startTime} - {activeItem.endTime} WIB
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rundown Table Container */}
        <div className="bg-slate-900 border border-slate-900/40 rounded-2xl overflow-hidden shadow-xl print:bg-white print:border-none print:shadow-none">
          <div className="px-6 py-4.5 border-b border-slate-800 flex items-center justify-between print:hidden">
            <h3 className="font-bold text-slate-100 font-sans flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Susunan Acara (Rundown)</span>
            </h3>
            {room.currentOffsetSeconds !== 0 && (
              <span className="text-[10px] px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono font-bold">
                Waktu Tergeser: {room.currentOffsetSeconds > 0 ? `+${room.currentOffsetSeconds / 60}m` : `${room.currentOffsetSeconds / 60}m`}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm print:text-black">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-mono text-xs uppercase tracking-wider print:bg-gray-100 print:text-black print:border-b-2 print:border-black">
                  <th className="py-4 px-6 w-36 print:py-2 print:px-4">Waktu (WIB)</th>
                  <th className="py-4 px-6 print:py-2 print:px-4">Agenda / Kegiatan</th>
                  <th className="py-4 px-6 w-24 text-center print:py-2 print:px-4">Durasi</th>
                  <th className="py-4 px-6 w-48 text-right print:hidden">Penanggung Jawab</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-y print:divide-gray-400">
                {timelineItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 italic print:text-gray-500">
                      Belum ada sesi rundown yang ditambahkan ke event ini.
                    </td>
                  </tr>
                ) : (
                  timelineItems.map((item) => (
                    <tr 
                      key={item.id}
                      className={`hover:bg-slate-950/10 transition-colors duration-100 print:hover:bg-transparent ${
                        item.isActive 
                          ? 'bg-indigo-600/10 text-indigo-200 border-l-2 border-l-indigo-500 print:bg-gray-100 print:text-black print:border-l-0' 
                          : 'text-slate-300 print:text-black'
                      }`}
                    >
                      <td className="py-4 px-6 font-semibold font-mono text-indigo-400 print:text-black print:py-2.5 print:px-4">
                        {item.startTime} - {item.endTime}
                      </td>
                      <td className="py-4 px-6 print:py-2.5 print:px-4">
                        <div className="font-bold print:text-sm">{item.title}</div>
                      </td>
                      <td className="py-4 px-6 text-center font-mono font-bold text-slate-400 print:text-black print:py-2.5 print:px-4">
                        {item.durationSeconds / 60}m
                      </td>
                      <td className="py-4 px-6 text-right print:hidden">
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
          Sinkronisasi real-time EventFlow • Gunakan tombol cetak di atas untuk mengekspor ke PDF.
        </footer>
      </main>
    </div>
  );
}
