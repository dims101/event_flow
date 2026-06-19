'use server';

import { db } from '@/db';
import { rooms, roleTokens, pics } from '@/db/schema';
import { getCurrentUser, getSessionUserId } from './auth';
import { eq, and } from 'drizzle-orm';

export async function createRoomAction(prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  const eventDate = formData.get('eventDate') as string;
  const rundownStartTime = (formData.get('rundownStartTime') as string) || '08:00';

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
      rundownStartTime,
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

    // Generate shared access token (role 'All') and stage monitor token (role 'Monitor')
    await db.insert(roleTokens).values({
      id: crypto.randomUUID(),
      roomId,
      token: crypto.randomUUID(),
      role: 'All',
    });

    await db.insert(roleTokens).values({
      id: crypto.randomUUID(),
      roomId,
      token: crypto.randomUUID(),
      role: 'Monitor',
    });

    await db.insert(roleTokens).values({
      id: crypto.randomUUID(),
      roomId,
      token: crypto.randomUUID(),
      role: 'Owner',
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

export async function updateRoomStartTimeAction(roomId: string, newStartTime: string) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return { error: 'Unauthorized' };

    await db
      .update(rooms)
      .set({ rundownStartTime: newStartTime })
      .where(and(eq(rooms.id, roomId), eq(rooms.userId, userId)));
    
    return { success: true };
  } catch (error) {
    console.error('Update room start time error:', error);
    return { error: 'Gagal memperbarui waktu mulai rundown' };
  }
}

/**
 * Generate a Monitor token for an existing room that doesn't have one yet.
 * Safe to call multiple times — returns existing token if already exists.
 */
export async function generateMonitorTokenAction(roomId: string) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return { error: 'Unauthorized' };

    // Verify room ownership
    const room = await db.query.rooms.findFirst({
      where: and(eq(rooms.id, roomId), eq(rooms.userId, userId)),
    });
    if (!room) return { error: 'Event tidak ditemukan atau Anda tidak memiliki akses' };

    // Check if Monitor token already exists
    const existing = await db.query.roleTokens.findFirst({
      where: and(eq(roleTokens.roomId, roomId), eq(roleTokens.role, 'Monitor')),
    });
    if (existing) return { success: true, token: existing.token };

    // Insert new Monitor token
    const newToken = crypto.randomUUID();
    await db.insert(roleTokens).values({
      id: crypto.randomUUID(),
      roomId,
      token: newToken,
      role: 'Monitor',
    });

    return { success: true, token: newToken };
  } catch (error) {
    console.error('Generate monitor token error:', error);
    return { error: 'Gagal membuat token monitor' };
  }
}

/**
 * Generate an Owner token for an existing room that doesn't have one yet.
 * Safe to call multiple times — returns existing token if already exists.
 */
export async function generateOwnerTokenAction(roomId: string) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return { error: 'Unauthorized' };

    // Verify room ownership
    const room = await db.query.rooms.findFirst({
      where: and(eq(rooms.id, roomId), eq(rooms.userId, userId)),
    });
    if (!room) return { error: 'Event tidak ditemukan atau Anda tidak memiliki akses' };

    // Check if Owner token already exists
    const existing = await db.query.roleTokens.findFirst({
      where: and(eq(roleTokens.roomId, roomId), eq(roleTokens.role, 'Owner')),
    });
    if (existing) return { success: true, token: existing.token };

    // Insert new Owner token
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
