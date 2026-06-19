# Sharing Rundown ke Event Owner Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Menambahkan fitur tautan akses khusus untuk Event Owner (klien) yang bersifat *read-only*, tersinkronisasi secara real-time, responsif di seluler/desktop, dan ramah cetak (print-friendly) ke printer/PDF untuk menghilangkan kebutuhan tangkapan layar (screenshot) dan ekspor Excel secara manual.

**Architecture:** 
1. Menggunakan basis akses `role_tokens` yang ada dengan peran baru `'Owner'`.
2. Membuat halaman publik baru `/s/[token]` yang memuat informasi rundown secara *read-only*.
3. Menyematkan *real-time listener* Supabase Realtime agar Event Owner dapat melihat perkembangan panggung secara langsung.
4. Mengimplementasikan cetak ramah-media (`@media print` via Tailwind `print:`) untuk secara dinamis menata ulang layout halaman menjadi dokumen putih-bersih standar kantor siap cetak.

**Tech Stack:**
* Next.js (App Router, Server Actions)
* Drizzle ORM + PostgreSQL
* Tailwind CSS (`print:` variants)
* Supabase Realtime (WebSockets)
* Lucide React (Icons)

---

### Task 1: Pembuatan Server Action untuk Token Owner

**Files:**
* Modify: `src/app/actions/room.ts`

**Langkah Implementasi:**

1. Buka file [room.ts](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/actions/room.ts).
2. Modifikasi fungsi `createRoomAction` untuk menyisipkan pembuatan token default untuk `'Owner'` secara otomatis saat EO membuat ruangan baru.
   ```typescript
   // Di bawah pembuatan token 'Monitor', tambahkan:
   await db.insert(roleTokens).values({
     id: crypto.randomUUID(),
     roomId,
     token: crypto.randomUUID(),
     role: 'Owner',
   });
   ```
3. Tambahkan fungsi baru `generateOwnerTokenAction(roomId: string)` di bagian bawah file untuk mendukung pembuatan token bagi ruangan/event lama yang belum memilikinya.
   ```typescript
   export async function generateOwnerTokenAction(roomId: string) {
     try {
       const userId = await getSessionUserId();
       if (!userId) return { error: 'Unauthorized' };

       const room = await db.query.rooms.findFirst({
         where: and(eq(rooms.id, roomId), eq(rooms.userId, userId)),
       });
       if (!room) return { error: 'Event tidak ditemukan atau Anda tidak memiliki akses' };

       const existing = await db.query.roleTokens.findFirst({
         where: and(eq(roleTokens.roomId, roomId), eq(roleTokens.role, 'Owner')),
       });
       if (existing) return { success: true, token: existing.token };

       const newToken = crypto.randomUUID();
       await db.insert(roleTokens).values({
         id: crypto.randomUUID(),
         roomId,
         token: newToken,
         role: 'Owner',
       });

       return { success: true, token: newToken };
     } catch (error) {
       console.error('Generate owner token error:', error);
       return { error: 'Gagal membuat token owner' };
     }
   }
   ```
4. Verifikasi kode terkompilasi dengan baik tanpa galat TypeScript.
5. *(Catatan: Sesuai instruksi user, jangan jalankan git commit / push ke github).*

---

### Task 2: Pembaruan UI Panel Berbagi (Share Panel)

**Files:**
* Modify: `src/app/dashboard/rooms/[id]/_components/SharePanel.tsx`

**Langkah Implementasi:**

1. Buka file [SharePanel.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/dashboard/rooms/%5Bid%5D/_components/SharePanel.tsx).
2. Impor fungsi `generateOwnerTokenAction` yang baru dibuat di baris atas.
3. Modifikasi component untuk membaca, menghasilkan, dan menyalin tautan Owner (`/s/[token]`).
4. Tambahkan tombol interaksi WhatsApp dan Salin Tautan khusus untuk Event Owner.
5. Tambahkan UI Card ketiga di samping "Monitor Bersama" dan "Monitor Panggung":
   * **Desain Persuasif (Choice Architecture)**: Menjelaskan dengan jelas kegunaan tautan ini (Tampilan eksklusif klien, bersih, bebas tombol kontrol, ramah cetak PDF).
   ```tsx
   // Tambahkan fungsi generate token Owner:
   const handleGenerateOwnerToken = () => {
     startGenerating(async () => {
       const res = await generateOwnerTokenAction(roomId);
       if (res.success && res.token) {
         setMonitorTokens((prev) => [
           ...prev,
           { role: 'Owner', token: res.token as string },
         ]);
       } else if (res.error) {
         alert(res.error);
       }
     });
   };

   // Dapatkan data token owner:
   const ownerToken = monitorTokens.find((t) => t.role === 'Owner');
   const ownerUrl = ownerToken ? `${origin}/s/${ownerToken.token}` : null;
   ```
6. Tambahkan grid item baru pada JSX rendering:
   ```tsx
   {/* ── Event Owner Share Link ── */}
   {ownerToken && ownerUrl ? (
     <div className="flex flex-col justify-between border border-slate-800/80 bg-slate-950/40 rounded-xl p-5 space-y-4 hover:border-slate-700 transition duration-150">
       <div>
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
             <Share2 className="w-4 h-4 text-indigo-400" />
             <span className="font-bold text-slate-100 font-sans">Tautan Event Owner (Klien)</span>
           </div>
           <span className="text-[10px] px-2.5 py-0.5 rounded border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 font-bold tracking-wider uppercase">
             Client View
           </span>
         </div>
         <p className="text-xs text-slate-400 mt-2 leading-relaxed">
           Bagikan tautan bersih ini ke klien. Dilengkapi dengan status live panggung serta opsi cetak ramah PDF tanpa login.
         </p>
       </div>

       <div className="flex items-center gap-2 pt-3 border-t border-slate-900/40">
         <button
           onClick={() => handleCopy(ownerUrl, 'owner')}
           className="flex-1 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-lg transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px]"
         >
           {copiedId === 'owner' ? (
             <>
               <Check className="w-3.5 h-3.5 text-emerald-400" />
               <span>Tersalin</span>
             </>
           ) : (
             <>
               <Copy className="w-3.5 h-3.5" />
               <span>Salin Link Owner</span>
             </>
           )}
         </button>
         <button
           onClick={() => handleWhatsApp(ownerUrl, 'Rundown Event Owner')}
           className="p-2 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 rounded-lg transition duration-150 text-xs flex items-center justify-center cursor-pointer min-h-[36px] min-w-[36px]"
           title="Kirim ke WhatsApp"
         >
           <Send className="w-4 h-4" />
         </button>
       </div>
     </div>
   ) : (
     <div className="flex flex-col border border-dashed border-slate-800/60 bg-slate-950/20 rounded-xl p-5 space-y-3">
       <div className="flex items-center gap-2">
         <Share2 className="w-4 h-4 text-slate-500" />
         <span className="font-bold text-slate-400 font-sans">Tautan Event Owner</span>
       </div>
       <p className="text-xs text-slate-500 leading-relaxed">
         Aktifkan tautan khusus ini untuk mempermudah berbagi dengan klien/pemilik acara secara instan.
       </p>
       <button
         onClick={handleGenerateOwnerToken}
         disabled={isGenerating}
         className="w-full py-2 text-xs font-semibold bg-indigo-650/20 hover:bg-indigo-650/30 disabled:opacity-50 border border-indigo-650/30 text-indigo-300 rounded-lg transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px]"
       >
         {isGenerating ? (
           <>
             <Loader2 className="w-3.5 h-3.5 animate-spin" />
             <span>Mengaktifkan…</span>
           </>
         ) : (
           <>
             <Plus className="w-3.5 h-3.5" />
             <span>Aktifkan Tautan Owner</span>
           </>
         )}
       </button>
     </div>
   )}
   ```

---

### Task 3: Pembuatan Rute Publik Halaman Share (`/s/[token]`)

**Files:**
* Create: `src/app/s/[token]/page.tsx`

**Langkah Implementasi:**

1. Buat file baru di path [page.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/s/[token]/page.tsx).
2. Tulis implementasi Next.js Dynamic Route (Server Component) untuk menyaring token:
   ```typescript
   import React from 'react';
   import { Metadata } from 'next';
   import { notFound } from 'next/navigation';
   import { db } from '@/db';
   import { roleTokens, rooms, rundownItems } from '@/db/schema';
   import { eq } from 'drizzle-orm';
   import OwnerShareView from './_components/OwnerShareView';
   import { AlertCircle } from 'lucide-react';

   export const metadata: Metadata = {
     title: 'Event Rundown - Client View',
   };

   export const dynamic = 'force-dynamic';

   interface OwnerPageProps {
     params: Promise<{ token: string }>;
   }

   export default async function OwnerPage({ params }: OwnerPageProps) {
     const { token } = await params;

     // 1. Resolve token
     const tokenData = await db.query.roleTokens.findFirst({
       where: eq(roleTokens.token, token),
     });

     if (!tokenData || tokenData.role !== 'Owner') {
       return (
         <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6 text-center space-y-4">
           <AlertCircle className="w-16 h-16 text-amber-500 animate-pulse" />
           <h1 className="text-2xl font-bold font-sans">Tautan Tidak Valid</h1>
           <p className="text-sm text-slate-400 max-w-sm">
             Tautan akses yang Anda gunakan salah, tidak ditujukan untuk owner, atau telah kedaluwarsa.
           </p>
         </div>
       );
     }

     // 2. Fetch room details & rundown items
     const [room, items] = await Promise.all([
       db.query.rooms.findFirst({
         where: eq(rooms.id, tokenData.roomId),
       }),
       db.query.rundownItems.findMany({
         where: eq(rundownItems.roomId, tokenData.roomId),
         orderBy: (rundownItems, { asc }) => [asc(rundownItems.orderIndex)],
       }),
     ]);

     if (!room) {
       notFound();
     }

     return (
       <OwnerShareView 
         roomId={room.id}
         roomName={room.name}
         token={token}
         initialRoom={room}
         initialItems={items}
       />
     );
   }
   ```

---

### Task 4: Desain Layout & Logika Interaksi Client View

**Files:**
* Create: `src/app/s/[token]/_components/OwnerShareView.tsx`

**Langkah Implementasi:**

1. Buat file baru di path [OwnerShareView.tsx](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/s/[token]/_components/OwnerShareView.tsx).
2. Buat komponen Client React dengan fitur sinkronisasi database real-time (melalui Supabase Realtime).
3. **Persuasive & Clean Choice Architecture (menggunakan @ux-persuasion-engineer)**:
   * **Mengurangi Beban Kognitif (Cognitive Load)**: Tampilkan jam aktual panggung untuk setiap sesi (seperti `08:00 - 08:30`) yang dikalkulasi secara otomatis dari waktu mulai acara ditambah durasi kumulatif sesi-sesi sebelumnya. 
   * **Live Timing Synchronization**: Jika panggung mengalami delay/offset, jam cetak/tampilan otomatis tergeser secara dinamis berkat penambahan `currentOffsetSeconds`.
   * **Fokus Utama**: Tampilkan tombol besar berwarna indigo "Cetak Rundown / PDF" di bagian atas halaman desktop sebagai CTA utama.
   * **Struktur Cetak Responsif (Tailwind CSS `print:`)**:
     * Sematkan class `print:hidden` pada navbar atas, tombol Cetak, status bar live, dan card status panggung.
     * Ubah background gelap aplikasi (`bg-slate-950`) menjadi latar putih bersih pada media cetak (`print:bg-white print:text-black`).
     * Rancang tabel rundown dengan border hitam tebal, tulisan tebal, dan teks hitam kontras tinggi agar tidak buram saat dicetak di kertas HVS A4 standar.
4. Tulis kode berikut:
   ```tsx
   'use client';

   import React, { useState, useEffect } from 'react';
   import { createClient } from '@supabase/supabase-js';
   import { Printer, Calendar, Clock, RefreshCw, FileText, ChevronRight } from 'lucide-react';

   // Supabase init
   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
   const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
   const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

   export default function OwnerShareView({
     roomId,
     roomName,
     initialRoom,
     initialItems,
   }: OwnerShareViewProps) {
     const [room, setRoom] = useState<Room>(initialRoom);
     const [items, setItems] = useState<RundownItem[]>(initialItems);

     // 1. Real-time Subscription
     useEffect(() => {
       const roomChannel = supabase
         .channel(`owner-room-${roomId}`)
         .on(
           'postgres_changes',
           { event: '*', scheme: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
           (payload) => {
             if (payload.new) {
               setRoom(payload.new as Room);
             }
           }
         )
         .subscribe();

       const rundownChannel = supabase
         .channel(`owner-rundown-${roomId}`)
         .on(
           'postgres_changes',
           { event: '*', scheme: 'public', table: 'rundown_items', filter: `room_id=eq.${roomId}` },
           () => {
             // Re-fetch rundown items via fetch API or simplified SSE trigger to stay simple
             window.location.reload();
           }
         )
         .subscribe();

       return () => {
         supabase.removeChannel(roomChannel);
         supabase.removeChannel(rundownChannel);
       };
     }, [roomId]);

     // 2. Helper calculation for wall clock times
     const getFormattedTime = (baseTimeStr: string, accumulatedSeconds: number) => {
       const [hours, minutes] = baseTimeStr.split(':').map(Number);
       const date = new Date();
       date.setHours(hours, minutes, 0, 0);
       date.setSeconds(date.getSeconds() + accumulatedSeconds);
       return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
     };

     // Compute timing schedule
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

     const activeItem = timelineItems.find(item => item.isActive);

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
               <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
                 EF
               </div>
               <div>
                 <span className="font-extrabold tracking-tight text-sm text-slate-100">EventFlow</span>
                 <span className="text-[10px] text-slate-400 block -mt-1">Client View Portal</span>
               </div>
             </div>
             <button
               onClick={() => window.print()}
               className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition duration-150 flex items-center gap-1.5 cursor-pointer"
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
               <span className="text-xl font-bold block text-indigo-700">EventFlow</span>
               <span className="text-[10px] text-gray-500 font-mono">Dibuat Otomatis • Tanpa Kertas</span>
             </div>
           </div>

           {/* Live Banner (Hidden on Print) */}
           <div className="border border-slate-900/60 bg-slate-900/30 backdrop-blur-sm rounded-2xl p-6 print:hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div className="space-y-1">
               <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">Status Live Panggung</span>
               <h2 className="text-2xl font-black text-slate-100">{roomName}</h2>
               <div className="flex items-center gap-4 text-sm text-slate-400 mt-2 font-mono">
                 <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-slate-500" /> {formattedDate}</span>
                 <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-slate-500" /> Mulai: {room.rundownStartTime} WIB</span>
               </div>
             </div>

             {/* Big Active Session Visual Indicator */}
             <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 md:w-80 flex items-center gap-4">
               {room.timerStatus === 'running' ? (
                 <span className="w-3.5 h-3.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
               ) : (
                 <span className="w-3.5 h-3.5 bg-amber-500 rounded-full shrink-0" />
               )}
               <div className="flex-1 min-w-0">
                 <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sesi Aktif Sekarang</span>
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
                 <span>Rundown Susunan Sesi</span>
               </h3>
               {room.currentOffsetSeconds !== 0 && (
                 <span className="text-xs px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono">
                   Penyesuaian Waktu: {room.currentOffsetSeconds > 0 ? `+${room.currentOffsetSeconds / 60}m` : `${room.currentOffsetSeconds / 60}m`}
                 </span>
               )}
             </div>

             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse text-sm print:text-black">
                 <thead>
                   <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-mono text-xs uppercase tracking-wider print:bg-gray-100 print:text-black print:border-b-2 print:border-black">
                     <th className="py-4 px-6 w-32 print:py-2 print:px-4">Waktu</th>
                     <th className="py-4 px-6 print:py-2 print:px-4">Nama Agenda / Kegiatan</th>
                     <th className="py-4 px-6 w-24 text-center print:py-2 print:px-4">Durasi</th>
                     <th className="py-4 px-6 w-40 text-right print:py-2 print:px-4 print:hidden">Pihak Bertugas (PIC)</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800/60 print:divide-y print:divide-gray-400">
                   {timelineItems.map((item) => (
                     <tr 
                       key={item.id}
                       className={`hover:bg-slate-950/20 transition-colors duration-100 print:hover:bg-transparent ${
                         item.isActive 
                           ? 'bg-indigo-650/10 text-indigo-200 border-l-2 border-l-indigo-500 print:bg-gray-50 print:text-black print:border-l-0' 
                           : 'text-slate-300 print:text-black'
                       }`}
                     >
                       <td className="py-4.5 px-6 font-semibold font-mono text-indigo-400 print:text-black print:py-2 print:px-4">
                         {item.startTime} - {item.endTime}
                       </td>
                       <td className="py-4.5 px-6 print:py-2 print:px-4">
                         <div className="font-bold print:text-sm">{item.title}</div>
                       </td>
                       <td className="py-4.5 px-6 text-center font-mono font-bold text-slate-400 print:text-black print:py-2 print:px-4">
                         {item.durationSeconds / 60}m
                       </td>
                       <td className="py-4.5 px-6 text-right print:hidden">
                         <div className="flex flex-wrap gap-1 justify-end">
                           {item.targetPics ? (
                             JSON.parse(item.targetPics).map((pic: string) => (
                               <span 
                                 key={pic}
                                 className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-950 border border-slate-800 text-slate-400"
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
                   ))}
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
   ```

---

### Task 5: Penambahan CSS Cetak Penyesuaian

**Files:**
* Modify: `src/app/globals.css`

**Langkah Implementasi:**

1. Buka file [globals.css](file:///C:/Users/Dimas/.gemini/antigravity/scratch/event_flow/src/app/globals.css).
2. Tambahkan CSS print-specific di bagian paling bawah untuk menjamin kejelasan cetak pada printer fisik/PDF:
   ```css
   @media print {
     body {
       background-color: white !important;
       color: black !important;
       -webkit-print-color-adjust: exact;
       print-color-adjust: exact;
     }
   }
   ```
