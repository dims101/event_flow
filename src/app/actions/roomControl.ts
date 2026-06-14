'use server';

import { db } from '@/db';
import { rooms, prompterMessages, rundownItems, activityLogs } from '@/db/schema';
import { redis } from '@/lib/redis';
import { eq, and } from 'drizzle-orm';

export async function logActivity(
  roomId: string,
  actionType: 'timer' | 'offset' | 'prompter' | 'rundown',
  description: string
) {
  try {
    await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      roomId,
      actionType,
      description,
      createdAt: Date.now(),
    });

    // Trigger SSE stream update
    const nowMs = Date.now();
    await redis.set(`room:${roomId}`, nowMs.toString());
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

export async function updateTimerStatusAction(
  roomId: string,
  status: 'running' | 'paused' | 'stopped',
  targetIndex?: number
) {
  try {
    const room = await db.query.rooms.findFirst({
      where: eq(rooms.id, roomId),
    });

    if (!room) return { error: 'Event tidak ditemukan' };

    let timerStartTime = room.timerStartTime;
    let timerElapsedSeconds = room.timerElapsedSeconds;
    let currentRundownIndex = room.currentRundownIndex;

    const nowMs = Date.now();
    let description = '';

    if (targetIndex !== undefined) {
      currentRundownIndex = targetIndex;
      // Reset elapsed for the new session
      timerElapsedSeconds = 0;
      timerStartTime = status === 'running' ? nowMs : null;

      // Fetch rundown item info for logging
      const item = await db.query.rundownItems.findFirst({
        where: and(
          eq(rundownItems.roomId, roomId),
          eq(rundownItems.orderIndex, targetIndex)
        ),
      });

      if (item) {
        description = `Pindah ke sesi "${item.title}" (${status === 'running' ? 'Timer dimulai' : 'Timer dijeda'})`;
      } else {
        description = `Pindah ke sesi indeks ${targetIndex}`;
      }
    } else {
      // Find current item for logging
      const item = room.currentRundownIndex !== -1
        ? await db.query.rundownItems.findFirst({
            where: and(
              eq(rundownItems.roomId, roomId),
              eq(rundownItems.orderIndex, room.currentRundownIndex)
            ),
          })
        : null;

      const itemSuffix = item ? ` (Sesi: "${item.title}")` : '';

      if (status === 'running') {
        if (room.timerStatus === 'paused') {
          description = `Timer dilanjutkan${itemSuffix}`;
        } else {
          description = `Timer dimulai${itemSuffix}`;
        }
      } else if (status === 'paused') {
        description = `Timer dijeda${itemSuffix}`;
      } else if (status === 'stopped') {
        description = `Timer dihentikan`;
      }
    }

    if (status === 'running') {
      if (room.timerStatus !== 'running') {
        timerStartTime = nowMs;
      }
    } else if (status === 'paused') {
      if (room.timerStatus === 'running' && room.timerStartTime) {
        const addedElapsed = Math.floor((nowMs - room.timerStartTime) / 1000);
        timerElapsedSeconds += addedElapsed;
      }
      timerStartTime = null;
    } else if (status === 'stopped') {
      timerStartTime = null;
      timerElapsedSeconds = 0;
      currentRundownIndex = -1;
    }

    await db
      .update(rooms)
      .set({
        timerStatus: status,
        timerStartTime,
        timerElapsedSeconds,
        currentRundownIndex,
      })
      .where(eq(rooms.id, roomId));

    // Log activity (this will also update redis and trigger SSE)
    if (description) {
      await logActivity(roomId, 'timer', description);
    } else {
      const nowMs = Date.now();
      await redis.set(`room:${roomId}`, nowMs.toString());
    }

    return { success: true };
  } catch (error: any) {
    console.error('Update timer status error:', error);
    return { error: 'Gagal memperbarui status timer' };
  }
}

export async function adjustRoomOffsetAction(roomId: string, seconds: number) {
  try {
    const room = await db.query.rooms.findFirst({
      where: eq(rooms.id, roomId),
    });

    if (!room) return { error: 'Event tidak ditemukan' };

    const newOffset = room.currentOffsetSeconds + seconds;

    await db
      .update(rooms)
      .set({ currentOffsetSeconds: newOffset })
      .where(eq(rooms.id, roomId));

    // Format offset nicely for logging
    const absSeconds = Math.abs(seconds);
    const direction = seconds > 0 ? 'ditambah' : 'dikurangi';
    let timeStr = '';
    if (absSeconds % 60 === 0) {
      timeStr = `${absSeconds / 60} menit`;
    } else {
      timeStr = `${absSeconds} detik`;
    }

    const totalAbsOffset = Math.abs(newOffset);
    let totalOffsetStr = '';
    if (newOffset === 0) {
      totalOffsetStr = '0';
    } else {
      const totalDir = newOffset > 0 ? '+' : '-';
      if (totalAbsOffset % 60 === 0) {
        totalOffsetStr = `${totalDir}${totalAbsOffset / 60} menit`;
      } else {
        totalOffsetStr = `${totalDir}${totalAbsOffset} detik`;
      }
    }

    const description = `Offset waktu ${direction} sebesar ${timeStr} (Total offset: ${totalOffsetStr})`;
    await logActivity(roomId, 'offset', description);

    return { success: true };
  } catch (error: any) {
    console.error('Adjust offset error:', error);
    return { error: 'Gagal menyesuaikan waktu' };
  }
}

export async function sendPrompterMessageAction(
  roomId: string,
  targetRole: string,
  message: string
) {
  if (!roomId || !targetRole || !message.trim()) {
    return { error: 'Pesan dan target divisi harus diisi' };
  }

  try {
    await db.insert(prompterMessages).values({
      id: crypto.randomUUID(),
      roomId,
      targetRole,
      message: message.trim(),
      createdAt: Date.now(),
    });

    const description = `Pesan prompter dikirim ke divisi ${targetRole}: "${message.trim()}"`;
    await logActivity(roomId, 'prompter', description);

    return { success: true };
  } catch (error: any) {
    console.error('Send prompter message error:', error);
    return { error: 'Gagal mengirim pesan prompter' };
  }
}

export async function clearPrompterMessagesAction(roomId: string) {
  try {
    await db.delete(prompterMessages).where(eq(prompterMessages.roomId, roomId));
    
    await logActivity(roomId, 'prompter', 'Semua pesan prompter dibersihkan');

    return { success: true };
  } catch (error: any) {
    console.error('Clear messages error:', error);
    return { error: 'Gagal membersihkan pesan' };
  }
}
