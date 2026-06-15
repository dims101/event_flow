'use server';

import { db } from "@/db";
import { pics, rooms } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUserId } from "./auth";
import { logActivityBackground } from "@/lib/serverUtils";

export async function addPicAction(roomId: string, name: string) {
  if (!roomId || !name.trim()) {
    return { error: 'Nama PIC harus diisi' };
  }

  try {
    const userId = await getSessionUserId();
    if (!userId) return { error: 'Unauthorized' };

    const room = await db.query.rooms.findFirst({
      where: and(eq(rooms.id, roomId), eq(rooms.userId, userId)),
    });
    if (!room) return { error: 'Event tidak ditemukan atau Anda tidak memiliki akses' };

    // Check if PIC with same name already exists in this room
    const existing = await db.query.pics.findFirst({
      where: and(eq(pics.roomId, roomId), eq(pics.name, name.trim())),
    });
    if (existing) {
      return { error: 'PIC dengan nama tersebut sudah ada' };
    }

    await db.insert(pics).values({
      id: crypto.randomUUID(),
      roomId,
      name: name.trim(),
      createdAt: Date.now(),
    });

    logActivityBackground(roomId, 'rundown', `PIC "${name.trim()}" ditambahkan`);

    return { success: true };
  } catch (error: any) {
    console.error('Add PIC error:', error);
    return { error: 'Gagal menambahkan PIC' };
  }
}

export async function deletePicAction(picId: string) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return { error: 'Unauthorized' };

    const pic = await db.query.pics.findFirst({
      where: eq(pics.id, picId),
    });
    if (!pic) return { error: 'PIC tidak ditemukan' };

    const room = await db.query.rooms.findFirst({
      where: and(eq(rooms.id, pic.roomId), eq(rooms.userId, userId)),
    });
    if (!room) return { error: 'Event tidak ditemukan atau Anda tidak memiliki akses' };

    await db.delete(pics).where(eq(pics.id, picId));

    logActivityBackground(pic.roomId, 'rundown', `PIC "${pic.name}" dihapus`);

    return { success: true };
  } catch (error: any) {
    console.error('Delete PIC error:', error);
    return { error: 'Gagal menghapus PIC' };
  }
}

export async function getPicsAction(roomId: string) {
  try {
    return await db.query.pics.findMany({
      where: eq(pics.roomId, roomId),
      orderBy: (pics, { asc }) => [asc(pics.createdAt)],
    });
  } catch (error) {
    console.error('Get PICs error:', error);
    return [];
  }
}
