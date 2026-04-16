import { NextResponse } from "next/server";
import { z } from "zod";

import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/audit/logger";
import { retryJob } from "@/lib/jobs/engine";
import { assertValidCsrf } from "@/lib/security/csrf";
import { assertRateLimit } from "@/lib/security/rateLimit";

const retrySchema = z.object({
  reason: z.string().min(6).max(400),
});

type RouteParams = {
  params: Promise<{ jobId: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  try {
    assertRateLimit(request, "automation-jobs-retry", {
      limit: 60,
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

  const parsed = retrySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { jobId } = await context.params;

  try {
    const job = await retryJob({
      actor: session,
      jobId,
      reason: parsed.data.reason,
    });

    await logAdminAction({
      actor: session,
      actionType: "automation.job.retry",
      resourceType: "automationJobRuns",
      resourceId: jobId,
      requestPayloadRedacted: { reason: parsed.data.reason },
      afterSnapshot: { retryJobId: job.id },
      result: "success",
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Retry failed";
    await logAdminAction({
      actor: session,
      actionType: "automation.job.retry",
      resourceType: "automationJobRuns",
      resourceId: jobId,
      requestPayloadRedacted: { reason: parsed.data.reason },
      result: "failure",
      errorCode: "AUTOMATION_RETRY_FAILED",
      errorMessage: message,
    });

    const statusCode =
      message === "JOB_NOT_FOUND"
        ? 404
        : message === "JOB_NOT_RETRYABLE"
          ? 409
          : message === "AUTOMATION_DISABLED"
            ? 423
          : 500;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}

