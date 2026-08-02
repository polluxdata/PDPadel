import { NextResponse, type NextRequest } from 'next/server';

export const SESSION_COOKIE = 'pdp_session';

const STATIC_ASSET = /\.(png|jpg|jpeg|svg|webp|gif|ico|txt|xml|webmanifest)$/i;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Assets estáticos (imágenes de la PWA, portada, etc.): servir sin sesión.
  if (STATIC_ASSET.test(pathname)) {
    return NextResponse.next();
  }

  const hasSession = req.cookies.has(SESSION_COOKIE);

  if (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/auth/confirm' ||
    pathname === '/auth/invite'
  ) {
    if (hasSession && pathname === '/login') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icons/|sw.js|workbox-.*|manifest.webmanifest).*)',
  ],
};
