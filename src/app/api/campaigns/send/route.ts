import { NextResponse } from "next/server";
import { z } from "zod";

import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/audit/logger";
import { getCampaignTemplateByKey } from "@/lib/campaigns/catalog";
import { createDryRunJob } from "@/lib/jobs/engine";
import { assertValidCsrf } from "@/lib/security/csrf";
import { assertRateLimit } from "@/lib/security/rateLimit";

const sendCampaignSchema = z.object({
  weekNumber: z.number().int().min(1).max(52).optional(),
  templateKey: z.string().min(1),
  audienceSegment: z.string().min(1),
  idempotencyKey: z.string().min(8),
  scheduleAt: z.string().optional(),
  isDryRun: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  try {
    assertRateLimit(request, "campaign-send", { limit: 80, windowMs: 60_000 });
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
    assertPermission(session, "campaigns.send");
    assertPermission(session, "automation.run");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const readOnlyMode = process.env.ADMIN_CENTER_READ_ONLY_MODE === "true";
  const parsed = sendCampaignSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const template = getCampaignTemplateByKey(payload.templateKey);
  if (!template) {
    return NextResponse.json(
      { error: "Unknown campaign template key." },
      { status: 400 },
    );
  }

  if (template.supportsWeekNumber && !payload.weekNumber) {
    return NextResponse.json(
      { error: "This template requires weekNumber." },
      { status: 400 },
    );
  }

  if (readOnlyMode && !payload.isDryRun) {
    return NextResponse.json(
      { error: "Admin center is in read-only mode. Live sends are disabled." },
      { status: 423 },
    );
  }

  try {
    const job = await createDryRunJob({
      actor: session,
      runbookId: template.runbookId,
      payload: {
        ...(template.supportsWeekNumber
          ? { weekNumber: payload.weekNumber }
          : {}),
        templateKey: payload.templateKey,
        audienceSegment: payload.audienceSegment,
        idempotencyKey: payload.idempotencyKey,
        ...(payload.scheduleAt ? { scheduleAt: payload.scheduleAt } : {}),
      },
      isDryRun: payload.isDryRun,
    });

    await logAdminAction({
      actor: session,
      actionType: "campaigns.send",
      resourceType: "automationJobRuns",
      resourceId: job.id,
      requestPayloadRedacted: payload,
      result: "success",
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    await logAdminAction({
      actor: session,
      actionType: "campaigns.send",
      resourceType: "automationJobRuns",
      requestPayloadRedacted: payload,
      result: "failure",
      errorCode: "CAMPAIGN_SEND_FAILED",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Campaign send failed",
      },
      { status: 500 },
    );
  }
}
