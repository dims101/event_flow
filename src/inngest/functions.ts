import { inngest, timerStartedEvent, timerPausedEvent, timerStoppedEvent } from "./client";
import { db } from "@/db";
import { rooms, rundownItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logActivityBackground } from "@/lib/serverUtils";
import { redis } from "@/lib/redis";

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
    // Wait for the exact duration needed
    await step.sleep("wait-for-session-end", `${event.data.durationSeconds}s`);

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

      const nextIndex = targetIndex + 1;
      const nowMs = Date.now();

      if (nextIndex < items.length) {
        // Move to next session
        const item = items.find(i => i.orderIndex === nextIndex);
        
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
