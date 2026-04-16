import { NextResponse } from "next/server";
import { z } from "zod";

import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/audit/logger";
import { assertValidCsrf } from "@/lib/security/csrf";
import { assertRateLimit } from "@/lib/security/rateLimit";
import { bulkUpdatePlatformUsers } from "@/lib/users/platformUsers";

const bulkUpdateSchema = z.object({
  reason: z.string().min(6).max(400),
  updates: z
    .array(
      z.object({
        uid: z.string().min(1),
        role: z.string().min(2),
        status: z.string().min(2),
        tier: z.string().min(2),
      }),
    )
    .min(1)
    .max(500),
});

export async function POST(request: Request) {
  try {
    assertRateLimit(request, "platform-user-bulk-update", {
      limit: 40,
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

  const parsed = bulkUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await bulkUpdatePlatformUsers({
      updates: parsed.data.updates,
      reason: parsed.data.reason,
      actorUid: session.uid,
      actorEmail: session.email,
    });

    await logAdminAction({
      actor: session,
      actionType: "users.platformBulkUpdate",
      resourceType: "users",
      requestPayloadRedacted: {
        total: parsed.data.updates.length,
        reason: parsed.data.reason,
      },
      afterSnapshot: {
        successCount: result.successCount,
        failureCount: result.failureCount,
      },
      result: "success",
    });

    return NextResponse.json(result);
  } catch (error) {
    await logAdminAction({
      actor: session,
      actionType: "users.platformBulkUpdate",
      resourceType: "users",
      requestPayloadRedacted: {
        total: parsed.data.updates.length,
        reason: parsed.data.reason,
      },
      result: "failure",
      errorCode: "PLATFORM_BULK_UPDATE_FAILED",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Platform bulk update failed",
      },
      { status: 500 },
    );
  }
}
