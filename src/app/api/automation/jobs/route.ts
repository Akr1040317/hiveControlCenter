import { NextResponse } from "next/server";

import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/audit/logger";
import { createDryRunJob } from "@/lib/jobs/engine";
import { getAdminDb } from "@/lib/firebase/admin";
import { assertRateLimit } from "@/lib/security/rateLimit";
import { assertValidCsrf } from "@/lib/security/csrf";

type CreateJobBody = {
  runbookId?: string;
  payload?: unknown;
  isDryRun?: boolean;
};

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection("automationJobRuns")
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();

  const jobs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  try {
    assertRateLimit(request, "automation-jobs", { limit: 100, windowMs: 60_000 });
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

  const body = (await request.json()) as CreateJobBody;
  if (!body.runbookId) {
    return NextResponse.json({ error: "Missing runbookId" }, { status: 400 });
  }

  const readOnlyMode = process.env.ADMIN_CENTER_READ_ONLY_MODE === "true";
  const requestedDryRun = body.isDryRun ?? true;

  if (readOnlyMode && !requestedDryRun) {
    return NextResponse.json(
      { error: "Admin center is in read-only mode. Live runs are disabled." },
      { status: 423 },
    );
  }

  try {
    const job = await createDryRunJob({
      actor: session,
      runbookId: body.runbookId,
      payload: body.payload,
      isDryRun: requestedDryRun,
    });

    await logAdminAction({
      actor: session,
      actionType: "automation.job.create",
      resourceType: "automationJobRuns",
      resourceId: job.id,
      requestPayloadRedacted: {
        runbookId: body.runbookId,
        isDryRun: requestedDryRun,
      },
      result: "success",
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    await logAdminAction({
      actor: session,
      actionType: "automation.job.create",
      resourceType: "automationJobRuns",
      requestPayloadRedacted: {
        runbookId: body.runbookId,
        isDryRun: requestedDryRun,
      },
      result: "failure",
      errorCode: "JOB_CREATE_FAILED",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Job creation failed" },
      { status: 400 },
    );
  }
}
