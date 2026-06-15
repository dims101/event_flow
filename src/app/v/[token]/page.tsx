import React from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { roleTokens, rooms, rundownItems, prompterMessages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import VendorView from './_components/VendorView';
import { AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface VendorPageProps {
  params: Promise<{ token: string }>;
}

export default async function VendorPage({ params }: VendorPageProps) {
  const { token } = await params;

  // 1. Resolve token
  const tokenData = await db.query.roleTokens.findFirst({
    where: eq(roleTokens.token, token),
  });

  if (!tokenData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6 text-center space-y-4">
        <AlertCircle className="w-16 h-16 text-amber-500 animate-pulse" />
        <h1 className="text-2xl font-bold font-sans">Tautan Tidak Valid</h1>
        <p className="text-sm text-slate-400 max-w-sm">
          Tautan akses yang Anda gunakan salah atau telah kedaluwarsa. Silakan minta tautan baru kepada pimpinan EO / Show Caller.
        </p>
      </div>
    );
  }

  // 2. Fetch room details, items, and messages in parallel on the server
  const [room, items, messages] = await Promise.all([
    db.query.rooms.findFirst({
      where: eq(rooms.id, tokenData.roomId),
    }),
    db.query.rundownItems.findMany({
      where: eq(rundownItems.roomId, tokenData.roomId),
      orderBy: (rundownItems, { asc }) => [asc(rundownItems.orderIndex)],
    }),
    db.query.prompterMessages.findMany({
      where: eq(prompterMessages.roomId, tokenData.roomId),
      orderBy: (prompterMessages, { desc }) => [desc(prompterMessages.createdAt)],
      limit: 15,
    }),
  ]);

  if (!room) {
    notFound();
  }

  return (
    <VendorView 
      roomId={room.id}
      roomName={room.name}
      vendorRole={tokenData.role}
      token={token}
      initialRoom={room}
      initialItems={items}
      initialMessages={messages}
    />
  );
}
