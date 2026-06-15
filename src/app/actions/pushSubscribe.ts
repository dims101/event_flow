'use server';

import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Saves or updates a push subscription token for a specific room and vendor role.
 */
export async function subscribeToPushAction(
  roomId: string,
  role: string,
  subJSON: { endpoint: string; keys: { p256dh: string; auth: string } },
  deviceInfo: string
) {
  try {
    const { endpoint, keys } = subJSON;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return { error: 'Invalid subscription object properties' };
    }

    // Check if subscription endpoint already exists
    const existing = await db.query.pushSubscriptions.findFirst({
      where: eq(pushSubscriptions.endpoint, endpoint),
    });

    if (existing) {
      // Update role or room details if changed
      await db
        .update(pushSubscriptions)
        .set({
          roomId,
          role,
          deviceInfo,
          createdAt: Date.now(),
        })
        .where(eq(pushSubscriptions.id, existing.id));
      return { success: true };
    }

    // Insert new subscription
    await db.insert(pushSubscriptions).values({
      id: crypto.randomUUID(),
      roomId,
      role,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      deviceInfo,
      createdAt: Date.now(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Failed to subscribe to push notifications:', error);
    return { error: 'Gagal mengaktifkan notifikasi push' };
  }
}

/**
 * Removes a push subscription endpoint.
 */
export async function unsubscribeFromPushAction(endpoint: string) {
  try {
    if (!endpoint) return { error: 'Endpoint is required' };
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    return { success: true };
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    return { error: 'Gagal menonaktifkan notifikasi' };
  }
}
