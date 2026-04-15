import { NextResponse } from "next/server";

import { createAdminSessionFromIdToken } from "@/lib/auth/session";
import { logAdminAction } from "@/lib/audit/logger";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

type SessionBody = {
  idToken?: string;
};

export async function POST(request: Request) {
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
