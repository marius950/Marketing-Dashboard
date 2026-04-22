import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // Eingeloggte User auf / weiterleiten wenn sie /login besuchen
    if (req.nextUrl.pathname === '/login' && req.nextauth.token) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      // Nur @ueberseehub.de Accounts dürfen durch
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        // Login-Seite und Auth-API immer erlauben
        if (path.startsWith('/api/auth') || path === '/login') return true;
        // Für alle anderen Seiten: Token mit ueberseehub.de Email prüfen
        const email = token?.email as string | undefined;
        return !!email?.endsWith('@ueberseehub.de');
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

// Welche Routen die Middleware schützt
export const config = {
  matcher: [
    // Alle Seiten außer _next/static, _next/image, favicon und public assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
