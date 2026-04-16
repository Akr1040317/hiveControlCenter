import { NextResponse } from "next/server";

import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/audit/logger";
import { assertRateLimit } from "@/lib/security/rateLimit";
import { assertValidCsrf } from "@/lib/security/csrf";
import { createDryRunJob } from "@/lib/jobs/engine";
import { getToolAction } from "@/lib/tools/toolActions";

type RunBody = {
  toolActionId?: string;
  params?: Record<string, unknown>;
  isDryRun?: boolean;
};

export async function POST(request: Request) {
  try {
    assertRateLimit(request, "tools-run", { limit: 30, windowMs: 60_000 });
    await assertValidCsrf(request);
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    return NextResponse.json({ error: "Missing or invalid CSRF token." }, { status: 403 });
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

  const body = (await request.json()) as RunBody;

  if (!body.toolActionId) {
    return NextResponse.json({ error: "Missing toolActionId" }, { status: 400 });
  }

  const action = getToolAction(body.toolActionId);
  if (!action) {
    return NextResponse.json({ error: `Unknown tool action: ${body.toolActionId}` }, { status: 400 });
  }

  const isDryRun = body.isDryRun ?? true;
  const idempotencyKey = `tool-${action.id}-${Date.now()}`;

  try {
    const payload = {
      ...body.params,
      idempotencyKey,
    };

    const job = await createDryRunJob({
      actor: session,
      runbookId: action.runbookId,
      payload,
      isDryRun,
    });

    await logAdminAction({
      actor: session,
      actionType: "tools.run",
      resourceType: "toolAction",
      resourceId: action.id,
      requestPayloadRedacted: {
        toolActionId: action.id,
        runbookId: action.runbookId,
        isDryRun,
        paramKeys: Object.keys(body.params ?? {}),
      },
      result: "success",
    });

    const jobData = job as Record<string, unknown>;

    return NextResponse.json({
      job: {
        id: jobData.id as string,
        status: (jobData.status as string) ?? "unknown",
        runbookId: (jobData.runbookId as string) ?? action.runbookId,
        isDryRun: Boolean(jobData.isDryRun ?? isDryRun),
      },
      toolActionId: action.id,
    }, { status: 201 });
  } catch (error) {
    await logAdminAction({
      actor: session,
      actionType: "tools.run",
      resourceType: "toolAction",
      resourceId: action.id,
      result: "failure",
      errorMessage: error instanceof Error ? error.message : "Unknown",
    });

    const message = error instanceof Error ? error.message : "Tool run failed";
    return NextResponse.json(
      { error: message },
      { status: message === "AUTOMATION_DISABLED" ? 423 : 400 },
    );
  }
}
