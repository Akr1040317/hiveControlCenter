import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { assertRateLimit } from "@/lib/security/rateLimit";
import { assertValidCsrf, CSRF_COOKIE_NAME } from "@/lib/security/csrf";

export async function POST(request: Request) {
  try {
    assertRateLimit(request, "auth-logout", { limit: 40, windowMs: 60_000 });
    await assertValidCsrf(request);
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      return NextResponse.json(
        { error: "Too many logout requests. Please retry shortly." },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "Missing or invalid CSRF token." },
      { status: 403 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  response.cookies.set({
    name: CSRF_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  return response;
}
