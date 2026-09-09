import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, AUTH_COOKIE_NAME } from './lib/jwt';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Paths that are publicly accessible
  const isPublicPath =
    pathname === '/login' ||
    pathname.startsWith('/api/auth');

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const verifiedPayload = token ? await verifyToken(token) : null;
  const isAuthenticated = !!verifiedPayload;

  // If user is already authenticated and visits /login, redirect to home
  if (pathname === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If public path, allow access
  if (isPublicPath) {
    return NextResponse.next();
  }

  // If not authenticated or token expired/invalid, redirect to login
  if (!isAuthenticated) {
    // If it's an API route (not /api/auth), return 401 Unauthorized
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets like .svg, .jpg, .png
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};