import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/challenges/new",
  "/matches",
  "/calendar",
  "/notifications",
  "/settings",
  "/admin",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtected) {
    // Check for standard Supabase session token or dev fallback session cookie
    const hasDevSession = request.cookies.has("debate_dev_session");
    const hasSupabaseSession = request.cookies
      .getAll()
      .some(
        (cookie: { name: string; value: string }) =>
          cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token")
      );

    if (!hasDevSession && !hasSupabaseSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/challenges/new",
    "/matches/:path*",
    "/calendar/:path*",
    "/notifications/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};
