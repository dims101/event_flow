import webpush from "web-push";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";

if (
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.VAPID_SUBJECT
) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function sendPushNotification(
  roomId: string,
  targetRole: string, // 'All', 'MC', 'Catering', dsb.
  payload: { title: string; body: string; url?: string }
) {
  if (
    !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY ||
    !process.env.VAPID_SUBJECT
  ) {
    console.warn("VAPID keys not configured in environment. Skipping push notification.");
    return;
  }

  try {
    // Parse targetRole strings like "MC, Fotografer" into an array
    const targetRolesArray = targetRole.split(',').map(r => r.trim()).filter(Boolean);

    // Find subscriptions for the given room and role (including role 'All')
    const subscriptions = await db.query.pushSubscriptions.findMany({
      where: and(
        eq(pushSubscriptions.roomId, roomId),
        targetRole === "All"
          ? undefined // Send to everyone in the room
          : or(
              inArray(pushSubscriptions.role, targetRolesArray),
              eq(pushSubscriptions.role, "All") // Anyone subscribed to 'All' should also receive it
            )
      ),
    });

    if (subscriptions.length === 0) return;

    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || "/",
      icon: "/icons/icon-192x192.png",
    });

    const promises = subscriptions.map(async (sub) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSub, payloadString);
      } catch (err: any) {
        // If the push service returns 404 (Not Found) or 410 (Gone), the subscription is expired
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.info(`Removing expired push subscription endpoint: ${sub.id}`);
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        } else {
          console.error(`Error sending push notification to endpoint ${sub.id}:`, err);
        }
      }
    });

    await Promise.all(promises);
  } catch (error) {
    console.error("Failed to send push notifications:", error);
  }
}
