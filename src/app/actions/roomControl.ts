'use server';

import { db } from '@/db';
import { rooms, prompterMessages, rundownItems, activityLogs, roleTokens } from '@/db/schema';
import { redis } from '@/lib/redis';
import { eq, and } from 'drizzle-orm';
import { sendPushNotification } from '@/lib/pushSender';
import { getSessionUserId } from './auth';
import { logActivityBackground } from '@/lib/serverUtils';

// Keep the awaited version for cases that need it
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
    await redis.set(`room:${roomId}`, Date.now().toString());
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

export async function updateTimerStatusAction(
  roomId: string,
  status: 'running' | 'paused' | 'stopped',
  targetIndex?: number,
  isAutoAdvance?: boolean
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return { error: 'Unauthorized' };

    const room = await db.query.rooms.findFirst({
      where: and(eq(rooms.id, roomId), eq(rooms.userId, userId)),
    });

    if (!room) return { error: 'Event tidak ditemukan atau Anda tidak memiliki akses' };

    // Prevent double auto-advance trigger and only advance if currently on the expected state
    if (isAutoAdvance) {
      if (status === 'stopped') {
        if (room.timerStatus === 'stopped') {
          return { success: true, reason: 'Already stopped' };
        }
      } else if (targetIndex !== undefined) {
        if (room.currentRundownIndex >= targetIndex) {
          return { success: true, reason: 'Already advanced' };
        }
        if (room.currentRundownIndex !== targetIndex - 1) {
          return { success: true, reason: 'Out of sequence auto-advance blocked' };
        }
      }
    }

    let timerStartTime = room.timerStartTime;
    let timerElapsedSeconds = room.timerElapsedSeconds;
    let currentRundownIndex = room.currentRundownIndex;

    const nowMs = Date.now();
    let description = '';

    if (targetIndex !== undefined) {
      currentRundownIndex = targetIndex;
      timerElapsedSeconds = 0;
      timerStartTime = status === 'running' ? nowMs : null;

      const item = await db.query.rundownItems.findFirst({
        where: and(
          eq(rundownItems.roomId, roomId),
          eq(rundownItems.orderIndex, targetIndex)
        ),
      });

      description = item
        ? `Pindah ke sesi "${item.title}" (${status === 'running' ? 'Timer dimulai' : 'Timer dijeda'})`
        : `Pindah ke sesi indeks ${targetIndex}`;
    } else {
      const item =
        room.currentRundownIndex !== -1
          ? await db.query.rundownItems.findFirst({
              where: and(
                eq(rundownItems.roomId, roomId),
                eq(rundownItems.orderIndex, room.currentRundownIndex)
              ),
            })
          : null;

      const itemSuffix = item ? ` (Sesi: "${item.title}")` : '';

      if (status === 'running') {
        description =
          room.timerStatus === 'paused'
            ? `Timer dilanjutkan${itemSuffix}`
            : `Timer dimulai${itemSuffix}`;
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

    // Await only the critical DB update — log runs in background
    await db
      .update(rooms)
      .set({ timerStatus: status, timerStartTime, timerElapsedSeconds, currentRundownIndex })
      .where(eq(rooms.id, roomId));

    // Fire-and-forget: does not block response
    logActivityBackground(roomId, 'timer', description || 'Timer diperbarui');

    return { success: true };
  } catch (error: any) {
    console.error('Update timer status error:', error);
    return { error: 'Gagal memperbarui status timer' };
  }
}

export async function adjustRoomOffsetAction(roomId: string, seconds: number) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return { error: 'Unauthorized' };

    const room = await db.query.rooms.findFirst({
      where: and(eq(rooms.id, roomId), eq(rooms.userId, userId)),
    });

    if (!room) return { error: 'Event tidak ditemukan atau Anda tidak memiliki akses' };

    const newOffset = room.currentOffsetSeconds + seconds;

    // Await only the critical DB update
    await db
      .update(rooms)
      .set({ currentOffsetSeconds: newOffset })
      .where(eq(rooms.id, roomId));

    // Build description string
    const absSeconds = Math.abs(seconds);
    const direction = seconds > 0 ? 'ditambah' : 'dikurangi';
    const timeStr = absSeconds % 60 === 0 ? `${absSeconds / 60} menit` : `${absSeconds} detik`;
    const totalAbsOffset = Math.abs(newOffset);
    const totalDir = newOffset > 0 ? '+' : newOffset < 0 ? '-' : '';
    const totalOffsetStr =
      newOffset === 0
        ? '0'
        : totalAbsOffset % 60 === 0
        ? `${totalDir}${totalAbsOffset / 60} menit`
        : `${totalDir}${totalAbsOffset} detik`;

    const description = `Offset waktu ${direction} sebesar ${timeStr} (Total offset: ${totalOffsetStr})`;

    // Fire-and-forget
    logActivityBackground(roomId, 'offset', description);

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
    const userId = await getSessionUserId();
    if (!userId) return { error: 'Unauthorized' };

    const room = await db.query.rooms.findFirst({
      where: and(eq(rooms.id, roomId), eq(rooms.userId, userId)),
    });
    if (!room) return { error: 'Event tidak ditemukan atau Anda tidak memiliki akses' };

    // Await the insert so the message is saved before we return
    await db.insert(prompterMessages).values({
      id: crypto.randomUUID(),
      roomId,
      targetRole,
      message: message.trim(),
      createdAt: Date.now(),
    });

    // Dispatch push notification to target vendors (awaited to prevent serverless event-loop freeze)
    try {
      // Find the shared role token to generate direct redirect link
      const roleToken = await db.query.roleTokens.findFirst({
        where: and(
          eq(roleTokens.roomId, roomId),
          eq(roleTokens.role, 'All')
        ),
      });

      await sendPushNotification(roomId, targetRole, {
        title: `📢 Prompter: [${targetRole}]`,
        body: message.trim(),
        url: roleToken ? `/v/${roleToken.token}` : '/',
      });
    } catch (pushErr) {
      console.error('Failed to dispatch push notification:', pushErr);
    }

    // Fire-and-forget log + SSE trigger
    logActivityBackground(
      roomId,
      'prompter',
      `Pesan prompter dikirim ke divisi ${targetRole}: "${message.trim()}"`
    );

    return { success: true };
  } catch (error: any) {
    console.error('Send prompter message error:', error);
    return { error: 'Gagal mengirim pesan prompter' };
  }
}

export async function clearPrompterMessagesAction(roomId: string) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return { error: 'Unauthorized' };

    const room = await db.query.rooms.findFirst({
      where: and(eq(rooms.id, roomId), eq(rooms.userId, userId)),
    });
    if (!room) return { error: 'Event tidak ditemukan atau Anda tidak memiliki akses' };

    await db.delete(prompterMessages).where(eq(prompterMessages.roomId, roomId));

    // Fire-and-forget
    logActivityBackground(roomId, 'prompter', 'Semua pesan prompter dibersihkan');

    return { success: true };
  } catch (error: any) {
    console.error('Clear messages error:', error);
    return { error: 'Gagal membersihkan pesan' };
  }
}

export async function sendTimeAlertNotificationAction(
  roomId: string,
  itemIndex: number,
  alertType: '5m' | '1m'
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return { error: 'Unauthorized' };

    const room = await db.query.rooms.findFirst({
      where: and(eq(rooms.id, roomId), eq(rooms.userId, userId)),
    });
    if (!room) return { error: 'Event tidak ditemukan atau Anda tidak memiliki akses' };

    // Deduplicate on server using Redis to prevent double notifications (TTL = 2 hours)
    const lockKey = `time_alert:${roomId}:${itemIndex}:${alertType}`;
    const alreadySent = await redis.get(lockKey);
    if (alreadySent) {
      return { success: false, reason: 'Already sent' };
    }

    // Lock the alert immediately
    await redis.set(lockKey, '1', { ex: 7200 });

    // Find the rundown item to know the target role and title
    const item = await db.query.rundownItems.findFirst({
      where: and(
        eq(rundownItems.roomId, roomId),
        eq(rundownItems.orderIndex, itemIndex)
      ),
    });

    if (!item) {
      return { error: 'Sesi rundown tidak ditemukan' };
    }

    const targetRole = item.targetRole || 'All';
    const alertLabel = alertType === '5m' ? '5 menit' : '1 menit';
    const title = alertType === '5m' ? `⏱️ Sisa Waktu: Sesi "${item.title}"` : `🚨 Bersiap! Sesi "${item.title}"`;
    const body = `Sesi "${item.title}" tersisa kurang dari ${alertLabel}! Harap bersiap.`;

    // Find the shared role token to generate direct redirect link
    const roleToken = await db.query.roleTokens.findFirst({
      where: and(
        eq(roleTokens.roomId, roomId),
        eq(roleTokens.role, 'All')
      ),
    });

    // Push notification trigger (awaited to prevent serverless event-loop freeze)
    try {
      await sendPushNotification(roomId, targetRole, {
        title,
        body,
        url: roleToken ? `/v/${roleToken.token}` : '/',
      });
    } catch (pushErr) {
      console.error('Failed to dispatch background time alert push notification:', pushErr);
    }

    // Log the activity to DB and SSE
    logActivityBackground(
      roomId,
      'timer',
      `Peringatan sisa ${alertLabel} dikirim untuk sesi "${item.title}" (Tujuan: ${targetRole})`
    );

    return { success: true };
  } catch (error: any) {
    console.error('Send time alert error:', error);
    return { error: 'Gagal mengirim peringatan waktu' };
  }
}

