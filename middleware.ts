import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "rfl_session";

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim() || "rankflow-lite-dev-secret";
  return new TextEncoder().encode(secret);
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  let signedIn = false;
  if (token) {
    try {
      await jwtVerify(token, secretKey());
      signedIn = true;
    } catch {
      signedIn = false;
    }
  }

  const { pathname } = req.nextUrl;
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (!signedIn && !isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (signedIn && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/new", "/articles/:path*", "/login", "/signup"],
};
