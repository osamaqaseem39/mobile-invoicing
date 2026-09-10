import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const isPublic = pathname.startsWith("/login") || pathname.startsWith("/api/auth");
  const session =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token");

  if (!session && !isPublic) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  // A cookie only proves a session was once issued, not that it still works —
  // the API token inside it can be dead. requireUser() is what can tell, and it
  // sends those people here with ?expired=1. Bouncing them back to "/" on the
  // strength of that stale cookie loops forever, so let /login render instead.
  if (session && pathname.startsWith("/login") && !searchParams.has("expired")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
