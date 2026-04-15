import { NextResponse } from "next/server";

import { createAdminSessionFromIdToken } from "@/lib/auth/session";
import { logAdminAction } from "@/lib/audit/logger";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { assertRateLimit } from "@/lib/security/rateLimit";
import { assertValidCsrf } from "@/lib/security/csrf";

type SessionBody = {
  idToken?: string;
};

export async function POST(request: Request) {
  try {
    assertRateLimit(request, "auth-session", { limit: 25, windowMs: 60_000 });
    await assertValidCsrf(request);
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Please wait and retry." },
        { status: 429 },
      );
    }
    if (
      error instanceof Error &&
      (error.message === "CSRF_MISSING" || error.message === "CSRF_INVALID")
    ) {
      return NextResponse.json(
        { error: "Missing or invalid CSRF token." },
        { status: 403 },
      );
    }
  }

  const body = (await request.json()) as SessionBody;

  if (!body.idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  try {
    const { sessionCookie, session } = await createAdminSessionFromIdToken(
      body.idToken,
    );

    const response = NextResponse.json({
      ok: true,
      user: { email: session.email, role: session.role },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    await logAdminAction({
      actor: session,
      actionType: "auth.session.create",
      resourceType: "auth_session",
      result: "success",
    });

    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED_EMAIL") {
      return NextResponse.json(
        { error: "This Google account is not allowlisted." },
        { status: 403 },
      );
    }
    if (error instanceof Error && error.message === "SUSPENDED_ADMIN") {
      return NextResponse.json(
        { error: "Admin access is suspended for this account." },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Unable to establish session." },
      { status: 401 },
    );
  }
}
