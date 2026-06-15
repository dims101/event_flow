/**
 * Server-side utility functions.
 * NOT a Server Action file — no 'use server' directive.
 * These helpers can be called from Server Actions but are not action endpoints.
 */

import { db } from '@/db';
import { activityLogs } from '@/db/schema';
import { redis } from '@/lib/redis';

/**
 * Fire-and-forget activity log — does NOT block the caller's response.
 * Inserts an activity log entry and triggers SSE via Redis publish in the background.
 */
export function logActivityBackground(
  roomId: string,
  actionType: 'timer' | 'offset' | 'prompter' | 'rundown',
  description: string
) {
  // Intentionally NOT awaited — runs after the response is sent to the client
  Promise.all([
    db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      roomId,
      actionType,
      description,
      createdAt: Date.now(),
    }),
    redis.set(`room:${roomId}`, Date.now().toString()),
  ]).catch((error) => console.error('Background logActivity error:', error));
}
