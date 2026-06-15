'use server';

import { db } from '@/db';
import { rooms, roleTokens, pics } from '@/db/schema';
import { getCurrentUser, getSessionUserId } from './auth';
import { eq, and } from 'drizzle-orm';

export async function createRoomAction(prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  const eventDate = formData.get('eventDate') as string;

  if (!name || !eventDate) {
    return { error: 'Nama event dan tanggal harus diisi' };
  }

  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return { error: 'Anda harus masuk terlebih dahulu' };
    }

    const roomId = crypto.randomUUID();

    // Insert room
    await db.insert(rooms).values({
      id: roomId,
      name,
      eventDate,
      userId,
      currentOffsetSeconds: 0,
      currentRundownIndex: -1,
      timerStatus: 'stopped',
      timerElapsedSeconds: 0,
    });

    // Seed default PICs: MC, MUA, and Fotografer
    const defaultPics = ['MC', 'MUA', 'Fotografer'];
    for (const name of defaultPics) {
      await db.insert(pics).values({
        id: crypto.randomUUID(),
        roomId,
        name,
        createdAt: Date.now(),
      });
    }

    // Generate only ONE token with role 'All' (shared access link)
    await db.insert(roleTokens).values({
      id: crypto.randomUUID(),
      roomId,
      token: crypto.randomUUID(),
      role: 'All',
    });

    return { success: true };
  } catch (error: any) {
    console.error('Create room error:', error);
    return { error: 'Gagal membuat event' };
  }
}

export async function getRoomsAction() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return [];

    return await db.query.rooms.findMany({
      where: eq(rooms.userId, userId),
      orderBy: (rooms, { desc }) => [desc(rooms.eventDate)],
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    return [];
  }
}

export async function deleteRoomAction(roomId: string) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return { error: 'Unauthorized' };

    await db.delete(rooms).where(and(eq(rooms.id, roomId), eq(rooms.userId, userId)));
    return { success: true };
  } catch (error) {
    console.error('Delete room error:', error);
    return { error: 'Gagal menghapus event' };
  }
}
