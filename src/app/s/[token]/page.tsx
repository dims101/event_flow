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
