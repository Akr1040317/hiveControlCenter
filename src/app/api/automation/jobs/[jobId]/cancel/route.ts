import { NextResponse } from "next/server";
import { z } from "zod";

import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/audit/logger";
import { assertValidCsrf } from "@/lib/security/csrf";
import { assertRateLimit } from "@/lib/security/rateLimit";
import { updateJobStatus } from "@/lib/jobs/engine";

const cancelSchema = z.object({
  reason: z.string().min(6).max(400),
});

type RouteParams = {
  params: Promise<{ jobId: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  try {
    assertRateLimit(request, "automation-jobs-cancel", {
      limit: 100,
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
    assertPermission(session, "automation.cancel");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = cancelSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const readOnlyMode = process.env.ADMIN_CENTER_READ_ONLY_MODE === "true";
  if (readOnlyMode) {
    return NextResponse.json(
      { error: "Admin center is in read-only mode." },
      { status: 423 },
    );
  }

  const { jobId } = await context.params;

  try {
    const job = await updateJobStatus({
      jobId,
      status: "cancelled",
      actorUid: session.uid,
      actorEmail: session.email,
      reason: parsed.data.reason,
    });

    await logAdminAction({
      actor: session,
      actionType: "automation.job.cancel",
      resourceType: "automationJobRuns",
      resourceId: jobId,
      requestPayloadRedacted: { reason: parsed.data.reason },
      afterSnapshot: { status: "cancelled" },
      result: "success",
    });

    return NextResponse.json({ job });
  } catch (error) {
    await logAdminAction({
      actor: session,
      actionType: "automation.job.cancel",
      resourceType: "automationJobRuns",
      resourceId: jobId,
      requestPayloadRedacted: { reason: parsed.data.reason },
      result: "failure",
      errorCode: "AUTOMATION_CANCEL_FAILED",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    const message = error instanceof Error ? error.message : "Cancel failed";
    return NextResponse.json(
      { error: message },
      { status: message === "JOB_NOT_FOUND" ? 404 : 500 },
    );
  }
}
