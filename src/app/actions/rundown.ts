'use server';

import { db } from '@/db';
import { rundownItems } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logActivity } from './roomControl';

export async function addRundownItemAction(prevState: any, formData: FormData) {
  const roomId = formData.get('roomId') as string;
  const title = formData.get('title') as string;
  const durationMinutesStr = formData.get('durationMinutes') as string;
  const targetRole = formData.get('targetRole') as string;

  if (!roomId || !title || !durationMinutesStr || !targetRole) {
    return { error: 'Semua kolom harus diisi' };
  }

  const durationMinutes = parseInt(durationMinutesStr, 10);
  if (isNaN(durationMinutes) || durationMinutes <= 0) {
    return { error: 'Durasi harus berupa angka positif' };
  }

  try {
    // Calculate the next order index
    const existingItems = await db.query.rundownItems.findMany({
      where: eq(rundownItems.roomId, roomId),
    });

    let nextOrderIndex = 0;
    if (existingItems.length > 0) {
      nextOrderIndex = Math.max(...existingItems.map(item => item.orderIndex)) + 1;
    }

    await db.insert(rundownItems).values({
      id: crypto.randomUUID(),
      roomId,
      title,
      durationSeconds: durationMinutes * 60,
      targetRole,
      orderIndex: nextOrderIndex,
    });

    await logActivity(
      roomId,
      'rundown',
      `Item rundown "${title}" ditambahkan (Durasi: ${durationMinutes} menit, Target: ${targetRole})`
    );

    return { success: true };
  } catch (error: any) {
    console.error('Add rundown item error:', error);
    return { error: 'Gagal menambahkan item jadwal' };
  }
}

export async function deleteRundownItemAction(itemId: string) {
  try {
    const item = await db.query.rundownItems.findFirst({
      where: eq(rundownItems.id, itemId),
    });

    if (!item) return { error: 'Item tidak ditemukan' };

    await db.delete(rundownItems).where(eq(rundownItems.id, itemId));

    await logActivity(
      item.roomId,
      'rundown',
      `Item rundown "${item.title}" dihapus`
    );

    return { success: true };
  } catch (error: any) {
    console.error('Delete rundown item error:', error);
    return { error: 'Gagal menghapus item jadwal' };
  }
}

export async function getRundownItemsAction(roomId: string) {
  try {
    return await db.query.rundownItems.findMany({
      where: eq(rundownItems.roomId, roomId),
      orderBy: (rundownItems, { asc }) => [asc(rundownItems.orderIndex)],
    });
  } catch (error) {
    console.error('Get rundown items error:', error);
    return [];
  }
}
