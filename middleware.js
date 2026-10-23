import { NextResponse } from 'next/server';

const COOKIE = 'vs_admin_session';

function verify(token, secret) {
  if (!token || !token.includes('.')) return null;
  try {
    const [body, sig] = token.split('.');
    // Edge-compatible HMAC via Web Crypto is heavier; decode expiry only here,
    // full HMAC verified in API routes. Middleware checks shape + expiry.
    const data = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));
    if (!data?.email || !data?.exp || Date.now() > data.exp) return null;
    if (!sig || sig.length < 10) return null;
    return data;
  } catch {
    return null;
  }
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const isLogin = pathname === '/login';
  const token = request.cookies.get(COOKIE)?.value;
  const session = verify(token, process.env.ADMIN_SESSION_SECRET);

  if (!session && !isLogin && !pathname.startsWith('/api/auth/login')) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (session && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
