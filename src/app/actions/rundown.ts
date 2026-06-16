'use server';

import { db } from '@/db';
import { rundownItems, rooms } from '@/db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { logActivity } from './roomControl';
import { getSessionUserId } from './auth';
import { logActivityBackground } from '@/lib/serverUtils';

export async function addRundownItemAction(prevState: any, formData: FormData) {
  const roomId = formData.get('roomId') as string;
  const title = formData.get('title') as string;
  const durationMinutesStr = formData.get('durationMinutes') as string;
  const targetPicsList = formData.getAll('targetPics') as string[];

  if (!roomId || !title || !durationMinutesStr) {
    return { error: 'Semua kolom harus diisi' };
  }

  const durationMinutes = parseInt(durationMinutesStr, 10);
  if (isNaN(durationMinutes) || durationMinutes <= 0) {
    return { error: 'Durasi harus berupa angka positif' };
  }

  const targetPics = targetPicsList.length > 0 ? JSON.stringify(targetPicsList) : JSON.stringify(['All']);
  const targetRole = targetPicsList.join(', ') || 'All';

  try {
    const userId = await getSessionUserId();
    if (!userId) return { error: 'Unauthorized' };

    const room = await db.query.rooms.findFirst({
      where: and(eq(rooms.id, roomId), eq(rooms.userId, userId)),
    });
    if (!room) return { error: 'Event tidak ditemukan atau Anda tidak memiliki akses' };

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
      targetPics,
      orderIndex: nextOrderIndex,
    });

    // Fire-and-forget log + SSE trigger
    logActivityBackground(
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
    const userId = await getSessionUserId();
    if (!userId) return { error: 'Unauthorized' };

    const item = await db.query.rundownItems.findFirst({
      where: eq(rundownItems.id, itemId),
    });

    if (!item) return { error: 'Item tidak ditemukan' };

    const room = await db.query.rooms.findFirst({
      where: and(eq(rooms.id, item.roomId), eq(rooms.userId, userId)),
    });
    if (!room) return { error: 'Event tidak ditemukan atau Anda tidak memiliki akses' };

    await db.delete(rundownItems).where(eq(rundownItems.id, itemId));

    // Fire-and-forget
    logActivityBackground(item.roomId, 'rundown', `Item rundown "${item.title}" dihapus`);

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

export async function reorderRundownItemsAction(roomId: string, orderedIds: string[]) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return { error: 'Unauthorized' };

    const room = await db.query.rooms.findFirst({
      where: and(eq(rooms.id, roomId), eq(rooms.userId, userId)),
    });
    if (!room) return { error: 'Event tidak ditemukan atau Anda tidak memiliki akses' };

    if (orderedIds.length > 0) {
      const sqlChunks = [];
      sqlChunks.push(sql`(case`);
      for (let i = 0; i < orderedIds.length; i++) {
        sqlChunks.push(sql`when ${rundownItems.id} = ${orderedIds[i]} then cast(${i} as integer)`);
      }
      sqlChunks.push(sql`end)`);

      const caseExpression = sql.join(sqlChunks, sql.raw(' '));

      await db
        .update(rundownItems)
        .set({ orderIndex: caseExpression })
        .where(
          and(
            eq(rundownItems.roomId, roomId),
            inArray(rundownItems.id, orderedIds)
          )
        );
    }

    logActivityBackground(roomId, 'rundown', 'Urutan rundown diperbarui');

    return { success: true };
  } catch (error: any) {
    console.error('Reorder rundown items error:', error);
    return { error: 'Gagal mengubah urutan rundown' };
  }
}

export async function editRundownItemAction(itemId: string, formData: FormData) {
  const title = formData.get('title') as string;
  const durationMinutesStr = formData.get('durationMinutes') as string;
  const targetPicsList = formData.getAll('targetPics') as string[];

  if (!title || !durationMinutesStr) {
    return { error: 'Semua kolom harus diisi' };
  }

  const durationMinutes = parseInt(durationMinutesStr, 10);
  if (isNaN(durationMinutes) || durationMinutes <= 0) {
    return { error: 'Durasi harus berupa angka positif' };
  }

  const targetPics = targetPicsList.length > 0 ? JSON.stringify(targetPicsList) : JSON.stringify(['All']);
  const targetRole = targetPicsList.join(', ') || 'All';

  try {
    const userId = await getSessionUserId();
    if (!userId) return { error: 'Unauthorized' };

    const item = await db.query.rundownItems.findFirst({
      where: eq(rundownItems.id, itemId),
    });

    if (!item) return { error: 'Item tidak ditemukan' };

    const room = await db.query.rooms.findFirst({
      where: and(eq(rooms.id, item.roomId), eq(rooms.userId, userId)),
    });
    if (!room) return { error: 'Event tidak ditemukan atau Anda tidak memiliki akses' };

    await db
      .update(rundownItems)
      .set({
        title,
        durationSeconds: durationMinutes * 60,
        targetRole,
        targetPics,
      })
      .where(eq(rundownItems.id, itemId));

    // Fire-and-forget
    logActivityBackground(
      item.roomId,
      'rundown',
      `Item rundown "${item.title}" diubah menjadi "${title}" (Durasi: ${durationMinutes} menit)`
    );

    return { success: true };
  } catch (error: any) {
    console.error('Edit rundown item error:', error);
    return { error: 'Gagal mengubah item jadwal' };
  }
}
