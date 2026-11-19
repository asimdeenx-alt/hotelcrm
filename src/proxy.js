// Next.js 16 request proxy (formerly middleware): redirects signed-out users to /login.
// API routes do their own auth checks and return JSON 401s.
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export async function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login" || pathname === "/signup") {
    return session ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (!session) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
