import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import { rooms, rundownItems, roleTokens, prompterMessages, activityLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Calendar, ArrowLeft } from 'lucide-react';


import { getSessionUserId } from '@/app/actions/auth';

import AddRundownForm from './_components/AddRundownForm';
import RundownTable from './_components/RundownTable';
import ControlPanel from './_components/ControlPanel';
import SharePanel from './_components/SharePanel';
import RoomTabs from './_components/RoomTabs';
import PicManagement from './_components/PicManagement';
import { getPicsAction } from '@/app/actions/pic';

export const dynamic = 'force-dynamic';

interface RoomPageProps {
  params: Promise<{ id: string }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { id: roomId } = await params;
  
  const userId = await getSessionUserId();
  if (!userId) notFound();

  // Step 1: Fetch room and verify ownership (sequential — needed before other queries)
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, roomId),
  });

  if (!room || room.userId !== userId) {
    notFound();
  }

  // Step 2: Fetch all remaining data IN PARALLEL — none depend on each other
  const [items, tokens, messages, logs, pics] = await Promise.all([
    db.query.rundownItems.findMany({
      where: eq(rundownItems.roomId, roomId),
      orderBy: (rundownItems, { asc }) => [asc(rundownItems.orderIndex)],
    }),
    db.query.roleTokens.findMany({
      where: eq(roleTokens.roomId, roomId),
    }),
    db.query.prompterMessages.findMany({
      where: eq(prompterMessages.roomId, roomId),
      orderBy: (prompterMessages, { desc }) => [desc(prompterMessages.createdAt)],
      limit: 15,
    }),
    db.query.activityLogs.findMany({
      where: eq(activityLogs.roomId, roomId),
      orderBy: (activityLogs, { desc }) => [desc(activityLogs.createdAt)],
      limit: 30,
    }),
    getPicsAction(roomId),
  ]);

  const formattedDate = new Date(room.eventDate).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Define tab sub-renderers
  const rundownBuilder = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2 space-y-4">
        <h4 className="text-md font-bold text-slate-100 uppercase tracking-wider font-sans">
          Jadwal Acara ({items.length} Sesi)
        </h4>
        <RundownTable items={items} />
      </div>
      <div className="space-y-6">
        <AddRundownForm roomId={roomId} pics={pics} />
        <PicManagement roomId={roomId} initialPics={pics} />
      </div>
    </div>
  );

  const controlCenter = (
    <ControlPanel 
      roomId={roomId}
      initialRoom={room}
      initialItems={items}
      initialMessages={messages}
      initialLogs={logs}
      pics={pics}
    />
  );

  const sharePanel = (
    <SharePanel tokens={tokens} roomName={room.name} />
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 font-mono">
            <Link href="/dashboard" className="hover:text-indigo-400 transition">Dashboard</Link>
            <span>/</span>
            <span className="text-slate-400">Manage Room</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 font-sans">{room.name}</h1>
          <p className="text-slate-400 text-sm mt-1 flex items-center gap-1.5 font-mono">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>{formattedDate}</span>
          </p>
        </div>
        <div>
          <Link
            href="/dashboard"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-800 text-slate-300 text-sm font-semibold rounded-xl transition duration-150 flex items-center gap-1.5 cursor-pointer min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Event</span>
          </Link>
        </div>
      </div>

      {/* Tabs Layout */}
      <Suspense fallback={<div className="py-12 text-center text-slate-500">Loading tabs…</div>}>
        <RoomTabs 
          rundownBuilder={rundownBuilder}
          controlCenter={controlCenter}
          sharePanel={sharePanel}
        />
      </Suspense>
    </div>
  );
}
