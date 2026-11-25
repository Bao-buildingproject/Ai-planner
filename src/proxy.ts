import { type NextRequest, NextResponse } from "next/server";

// Must match the names in src/server/auth.ts (the proxy runs separately from the app code).
const SESSION_COOKIES = ["__Host-aip_session", "aip_session"];

/**
 * Optimistic check only: app pages without a session cookie go to /login.
 * Pages and API routes still validate the session against the database.
 */
export function proxy(request: NextRequest) {
  if (SESSION_COOKIES.some((name) => request.cookies.get(name)?.value)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/week/:path*", "/account/:path*"] };
