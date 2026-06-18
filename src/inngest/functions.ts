import { inngest, timerStartedEvent, timerPausedEvent, timerStoppedEvent } from "./client";
import { db } from "@/db";
import { rooms, rundownItems, roleTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { logActivityBackground } from "@/lib/serverUtils";
import { redis } from "@/lib/redis";
import { sendPushNotification } from "@/lib/pushSender";

export const timerAutoAdvance = inngest.createFunction(
  {
    id: "timer-auto-advance",
    triggers: [{ event: "timer/started" }],
    cancelOn: [
      { event: "timer/paused", match: "data.roomId" },
      { event: "timer/stopped", match: "data.roomId" },
      { event: "timer/started", match: "data.roomId" }
    ]
  },
  async ({ event, step }) => {
    const { roomId, targetIndex, startTime } = event.data;
    let remaining = event.data.durationSeconds;

    // Helper to send push
    const sendPush = async (alertLabel: string, remainingTimeDesc: string) => {
      const lockKey = `time_alert:${roomId}:${targetIndex}:${alertLabel}`;
      if (alertLabel !== 'Sesi Berganti') {
        const alreadySent = await redis.get(lockKey);
        if (alreadySent) return;
        await redis.set(lockKey, '1', { ex: 7200 }); // lock for 2 hours
      }

      const room = await db.query.rooms.findFirst({ where: eq(rooms.id, roomId) });
      if (!room || room.timerStatus !== "running" || String(room.timerStartTime) !== String(startTime) || String(room.currentRundownIndex) !== String(targetIndex)) return;

      const item = await db.query.rundownItems.findFirst({
        where: and(eq(rundownItems.roomId, roomId), eq(rundownItems.orderIndex, targetIndex)),
      });
      if (!item) return;

      const roleToken = await db.query.roleTokens.findFirst({
        where: and(eq(roleTokens.roomId, roomId), eq(roleTokens.role, 'All')),
      });

      const title = alertLabel === 'Sesi Berganti' ? `🔄 Sesi Berganti: "${item.title}"` : (alertLabel === '5m' ? `⏱️ Sisa Waktu: Sesi "${item.title}"` : `🚨 Bersiap! Sesi "${item.title}"`);
      const body = alertLabel === 'Sesi Berganti' ? `Sesi "${item.title}" telah dimulai!` : `Sesi "${item.title}" tersisa kurang dari ${remainingTimeDesc}! Harap bersiap.`;

      try {
        await sendPushNotification(roomId, item.targetRole || 'All', {
          title,
          body,
          url: roleToken ? `/v/${roleToken.token}` : '/',
        });
      } catch (err) {
        console.error(`Failed to send push for ${alertLabel}:`, err);
      }
    };

    if (remaining > 300) {
      await step.sleep("wait-for-5m-warning", `${remaining - 300}s`);
      remaining = 300;
      await step.run("send-5m-warning", async () => {
        const room = await db.query.rooms.findFirst({ where: eq(rooms.id, roomId) });
        if (room?.enablePush5m) await sendPush('5m', '5 menit');
      });
    }

    if (remaining > 60) {
      await step.sleep("wait-for-1m-warning", `${remaining - 60}s`);
      remaining = 60;
      await step.run("send-1m-warning", async () => {
        const room = await db.query.rooms.findFirst({ where: eq(rooms.id, roomId) });
        if (room?.enablePush1m) await sendPush('1m', '1 menit');
      });
    }

    if (remaining > 0) {
      await step.sleep("wait-for-session-end", `${remaining}s`);
    }

    // Time is up, auto advance
    await step.run("auto-advance", async () => {
      const { roomId, targetIndex, startTime } = event.data;
      
      const room = await db.query.rooms.findFirst({
        where: eq(rooms.id, roomId),
      });

      if (!room) return;

      // Ensure that the timer hasn't been changed during sleep (race condition fallback)
      if (room.timerStatus !== "running" || String(room.timerStartTime) !== String(startTime) || String(room.currentRundownIndex) !== String(targetIndex)) {
        return;
      }

      // Find all items to get the next index
      const items = await db.query.rundownItems.findMany({
        where: eq(rundownItems.roomId, roomId),
        orderBy: (rundownItems, { asc }) => [asc(rundownItems.orderIndex)],
      });

      const currentIndexInArray = items.findIndex(i => String(i.orderIndex) === String(targetIndex));
      const nextItem = currentIndexInArray !== -1 ? items[currentIndexInArray + 1] : undefined;
      const nowMs = Date.now();

      if (nextItem) {
        const nextIndex = nextItem.orderIndex;
        // Move to next session
        const item = nextItem;
        
        await db.update(rooms).set({
          timerStatus: "running",
          timerStartTime: nowMs,
          timerElapsedSeconds: 0,
          currentRundownIndex: nextIndex,
          currentOffsetSeconds: 0
        }).where(eq(rooms.id, roomId));

        if (item) {
          await db.update(rundownItems).set({ appliedOffsetSeconds: 0 }).where(eq(rundownItems.id, item.id));
        }

        if (room.enablePushSessionChange && item) {
          const roleToken = await db.query.roleTokens.findFirst({
            where: and(eq(roleTokens.roomId, roomId), eq(roleTokens.role, 'All')),
          });
          try {
            await sendPushNotification(roomId, item.targetRole || 'All', {
              title: `🔄 Sesi Berganti: "${item.title}"`,
              body: `Sesi "${item.title}" telah dimulai!`,
              url: roleToken ? `/v/${roleToken.token}` : '/',
            });
          } catch (err) {
            console.error('Failed to send session change push:', err);
          }
        }

        logActivityBackground(roomId, 'timer', `Pindah ke sesi "${item?.title || nextIndex}" (Timer otomatis)`);
        await redis.set(`room:${roomId}`, nowMs.toString());

        // We trigger the next timer
        await inngest.send({
          name: "timer/started",
          data: {
            roomId: roomId,
            targetIndex: nextIndex,
            durationSeconds: item ? item.durationSeconds : 0,
            startTime: nowMs
          }
        });
      } else {
        // This was the last session! Stop the timer.
        await db.update(rooms).set({
          timerStatus: "stopped",
          timerStartTime: null,
          timerElapsedSeconds: 0,
          currentRundownIndex: -1,
          currentOffsetSeconds: 0
        }).where(eq(rooms.id, roomId));
        logActivityBackground(roomId, 'timer', `Acara selesai (Timer otomatis)`);
        await redis.set(`room:${roomId}`, nowMs.toString());
      }
    });
  }
);
