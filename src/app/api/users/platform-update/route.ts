import { NextResponse } from "next/server";
import { z } from "zod";

import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/audit/logger";
import { assertValidCsrf } from "@/lib/security/csrf";
import { assertRateLimit } from "@/lib/security/rateLimit";
import { updatePlatformUser } from "@/lib/users/platformUsers";

const platformUpdateSchema = z.object({
  uid: z.string().min(1),
  role: z.string().min(2),
  status: z.string().min(2),
  tier: z.string().min(2),
  reason: z.string().min(6).max(400),
});

export async function POST(request: Request) {
  try {
    assertRateLimit(request, "platform-user-update", {
      limit: 120,
      windowMs: 60_000,
    });
    await assertValidCsrf(request);
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      return NextResponse.json(
        { error: "Too many requests. Please retry in a minute." },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "Missing or invalid CSRF token." },
      { status: 403 },
    );
  }

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertPermission(session, "users.write");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const readOnlyMode = process.env.ADMIN_CENTER_READ_ONLY_MODE === "true";
  if (readOnlyMode) {
    return NextResponse.json(
      { error: "Admin center is in read-only mode." },
      { status: 423 },
    );
  }

  const parsed = platformUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const payload = parsed.data;
    const user = await updatePlatformUser({
      ...payload,
      actorUid: session.uid,
      actorEmail: session.email,
    });

    await logAdminAction({
      actor: session,
      actionType: "users.platformUpdate",
      resourceType: "users",
      resourceId: payload.uid,
      requestPayloadRedacted: payload,
      afterSnapshot: {
        role: payload.role,
        status: payload.status,
        tier: payload.tier,
      },
      result: "success",
    });

    return NextResponse.json({ user });
  } catch (error) {
    const payload = parsed.data;
    await logAdminAction({
      actor: session,
      actionType: "users.platformUpdate",
      resourceType: "users",
      resourceId: payload.uid,
      requestPayloadRedacted: payload,
      result: "failure",
      errorCode: "PLATFORM_USER_UPDATE_FAILED",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    const message =
      error instanceof Error ? error.message : "Platform user update failed";
    return NextResponse.json(
      { error: message },
      { status: message === "PLATFORM_USER_NOT_FOUND" ? 404 : 500 },
    );
  }
}
