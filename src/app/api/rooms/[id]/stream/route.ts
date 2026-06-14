import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';
import { db } from '@/db';
import { rooms, rundownItems, prompterMessages, activityLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';


export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params;
  const encoder = new TextEncoder();

  const customReadable = new ReadableStream({
    async start(controller) {
      const sendEvent = (type: string, data: any) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch (e) {
          // Stream might be closed
        }
      };

      const fetchAndSendState = async () => {
        try {
          const room = await db.query.rooms.findFirst({
            where: eq(rooms.id, roomId),
          });

          if (!room) return;

          const items = await db.query.rundownItems.findMany({
            where: eq(rundownItems.roomId, roomId),
            orderBy: (rundownItems, { asc }) => [asc(rundownItems.orderIndex)],
          });

          const messages = await db.query.prompterMessages.findMany({
            where: eq(prompterMessages.roomId, roomId),
            orderBy: (prompterMessages, { desc }) => [desc(prompterMessages.createdAt)],
            limit: 10,
          });

          const logs = await db.query.activityLogs.findMany({
            where: eq(activityLogs.roomId, roomId),
            orderBy: (activityLogs, { desc }) => [desc(activityLogs.createdAt)],
            limit: 30,
          });

          sendEvent('state', {
            room,
            items,
            messages,
            logs,
          });
        } catch (err) {
          console.error('SSE data fetch error:', err);
        }
      };

      // Send initial data immediately
      await fetchAndSendState();

      // Subscribe to room-specific updates
      const unsubscribe = redis.subscribe(roomId, async () => {
        await fetchAndSendState();
      });

      // Keep connection alive with heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (e) {
          // Connection closed
        }
      }, 15000);

      // Clean up when client disconnects
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        clearInterval(heartbeatInterval);
        try {
          controller.close();
        } catch (e) {}
      });
    },
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
