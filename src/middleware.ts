import { NextResponse } from 'next/server'

// Auth is enforced client-side via AuthGuard and server-side via Firebase Admin
// token verification in each API route. This middleware exists as a skeleton
// for future server-side session-cookie verification when Firebase Auth's
// httpOnly session cookie flow is implemented.
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
