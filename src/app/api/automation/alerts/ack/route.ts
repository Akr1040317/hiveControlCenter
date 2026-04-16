import { NextResponse } from "next/server";
import { z } from "zod";

import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/audit/logger";
import { acknowledgeAutomationAlert } from "@/lib/jobs/engine";
import { assertValidCsrf } from "@/lib/security/csrf";
import { assertRateLimit } from "@/lib/security/rateLimit";

const ackSchema = z.object({
  alertId: z.string().min(4),
  reason: z.string().min(6).max(400),
});

export async function POST(request: Request) {
  try {
    assertRateLimit(request, "automation-alert-ack", {
      limit: 80,
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
    assertPermission(session, "automation.run");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = ackSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await acknowledgeAutomationAlert({
    alertId: parsed.data.alertId,
    actor: session,
    reason: parsed.data.reason,
  });

  await logAdminAction({
    actor: session,
    actionType: "automation.alert.ack",
    resourceType: "automationAlertAcks",
    resourceId: parsed.data.alertId,
    requestPayloadRedacted: { reason: parsed.data.reason },
    result: "success",
  });

  return NextResponse.json({ ok: true });
}

