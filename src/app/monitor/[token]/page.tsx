import React from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { roleTokens, rooms, rundownItems, prompterMessages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import MonitorView from './_components/MonitorView';
import { AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface MonitorPageProps {
  params: Promise<{ token: string }>;
}

export default async function MonitorPage({ params }: MonitorPageProps) {
  const { token } = await params;

  // 1. Resolve token — must be a Monitor role token
  const tokenData = await db.query.roleTokens.findFirst({
    where: eq(roleTokens.token, token),
  });

  if (!tokenData || tokenData.role !== 'Monitor') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-slate-100 p-6 text-center space-y-4">
        <AlertCircle className="w-16 h-16 text-amber-500 animate-pulse" />
        <h1 className="text-2xl font-bold font-sans">Tautan Monitor Tidak Valid</h1>
        <p className="text-sm text-slate-400 max-w-sm">
          Tautan monitor yang Anda gunakan tidak valid. Silakan minta tautan monitor baru kepada Show Caller.
        </p>
      </div>
    );
  }

  // 2. Fetch room, items, and Monitor-only messages in parallel
  const [room, items, messages] = await Promise.all([
    db.query.rooms.findFirst({
      where: eq(rooms.id, tokenData.roomId),
    }),
    db.query.rundownItems.findMany({
      where: eq(rundownItems.roomId, tokenData.roomId),
      orderBy: (rundownItems, { asc }) => [asc(rundownItems.orderIndex)],
    }),
    db.query.prompterMessages.findMany({
      where: and(
        eq(prompterMessages.roomId, tokenData.roomId),
        eq(prompterMessages.targetRole, 'Monitor')
      ),
      orderBy: (prompterMessages, { desc }) => [desc(prompterMessages.createdAt)],
      limit: 5,
    }),
  ]);

  if (!room) {
    notFound();
  }

  return (
    <MonitorView
      roomId={room.id}
      roomName={room.name}
      initialRoom={room}
      initialItems={items}
      initialMessages={messages}
    />
  );
}
