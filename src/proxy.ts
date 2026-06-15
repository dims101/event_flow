import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  const path = request.nextUrl.pathname;

  if (path.startsWith('/dashboard') && !session) {
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res;
  }

  if ((path === '/login' || path === '/register' || path === '/') && session) {
    const res = NextResponse.redirect(new URL('/dashboard', request.url));
    res.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register', '/'],
};
