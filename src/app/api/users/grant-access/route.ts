import { NextResponse } from "next/server";
import { z } from "zod";

import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/audit/logger";
import { isEmailAllowlisted } from "@/lib/auth/allowlist";
import { upsertAdminUser } from "@/lib/users/adminUsers";

const grantAccessSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().optional().nullable(),
  role: z.enum([
    "super_admin",
    "ops_admin",
    "marketing_admin",
    "support_admin",
    "finance_admin",
    "viewer",
  ]),
  status: z.enum(["active", "suspended"]),
  reason: z.string().min(6).max(400),
});

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertPermission(session, "users.write");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = grantAccessSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const normalizedEmail = payload.email.toLowerCase();

  if (!isEmailAllowlisted(normalizedEmail)) {
    return NextResponse.json(
      {
        error:
          "Email is not in ADMIN_EMAIL_ALLOWLIST. Add it before granting access.",
      },
      { status: 403 },
    );
  }

  try {
    const updatedUser = await upsertAdminUser({
      uid: payload.uid,
      email: normalizedEmail,
      displayName: payload.displayName ?? null,
      role: payload.role,
      status: payload.status,
    });

    await logAdminAction({
      actor: session,
      actionType: "users.grantAccess",
      resourceType: "adminUsers",
      resourceId: payload.uid,
      requestPayloadRedacted: {
        uid: payload.uid,
        email: normalizedEmail,
        role: payload.role,
        status: payload.status,
        reason: payload.reason,
      },
      afterSnapshot: {
        role: payload.role,
        status: payload.status,
      },
      result: "success",
    });

    return NextResponse.json({ user: updatedUser }, { status: 200 });
  } catch (error) {
    await logAdminAction({
      actor: session,
      actionType: "users.grantAccess",
      resourceType: "adminUsers",
      resourceId: payload.uid,
      requestPayloadRedacted: {
        uid: payload.uid,
        email: normalizedEmail,
        role: payload.role,
        status: payload.status,
      },
      result: "failure",
      errorCode: "USERS_GRANT_ACCESS_FAILED",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to grant admin access",
      },
      { status: 500 },
    );
  }
}
