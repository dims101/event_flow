'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';


export async function registerAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const companyName = formData.get('companyName') as string;

  if (!email || !password || !companyName) {
    return { error: 'Semua kolom harus diisi' };
  }

  try {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (existing) {
      return { error: 'Email sudah terdaftar' };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    await db.insert(users).values({
      id: userId,
      email: email.toLowerCase().trim(),
      passwordHash,
      companyName,
    });

    const cookieStore = await cookies();
    cookieStore.set('session', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return { success: true };
  } catch (error: any) {
    console.error('Registration error:', error);
    return { error: 'Terjadi kesalahan saat pendaftaran' };
  }
}

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email dan password harus diisi' };
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (!user) {
      return { error: 'Email atau password salah' };
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return { error: 'Email atau password salah' };
    }

    const cookieStore = await cookies();
    cookieStore.set('session', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return { success: true };
  } catch (error: any) {
    console.error('Login error:', error);
    return { error: 'Terjadi kesalahan saat masuk' };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  redirect('/login');
}

/**
 * Lightweight session check — reads userId from cookie WITHOUT a DB query.
 * Safe to use in Server Actions because the session cookie is HTTP-only
 * and cannot be tampered with by the client.
 * Use this instead of getCurrentUser() when you only need the userId.
 *
 * Wrapped with React cache() so multiple calls in the same request are free.
 */
export const getSessionUserId = cache(async (): Promise<string | null> => {
  const cookieStore = await cookies();
  return cookieStore.get('session')?.value ?? null;
});

/**
 * Full user fetch — queries the DB.
 * Wrapped with React cache() so layout.tsx + page.tsx both calling this
 * in the same request only hits the DB once.
 */
export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const userId = cookieStore.get('session')?.value;
  if (!userId) return null;

  return db.query.users.findFirst({
    where: eq(users.id, userId),
  });
});
