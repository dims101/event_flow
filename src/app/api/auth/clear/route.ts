import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  
  const { origin } = new URL(request.url);
  const res = NextResponse.redirect(new URL('/login', origin));
  res.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  return res;
}
