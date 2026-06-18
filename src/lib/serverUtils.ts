/**
 * Server-side utility functions.
 * NOT a Server Action file — no 'use server' directive.
 * These helpers can be called from Server Actions but are not action endpoints.
 */

import { db } from '@/db';
import { activityLogs } from '@/db/schema';

/**
 * Fire-and-forget activity log — does NOT block the caller's response.
 * Inserts an activity log entry.
 */
export function logActivityBackground(
  roomId: string,
  actionType: 'timer' | 'offset' | 'prompter' | 'rundown',
  description: string
) {
  // Intentionally NOT awaited — runs after the response is sent to the client
  db.insert(activityLogs).values({
    id: crypto.randomUUID(),
    roomId,
    actionType,
    description,
    createdAt: Date.now(),
  }).catch((error) => console.error('Background logActivity error:', error));
}
