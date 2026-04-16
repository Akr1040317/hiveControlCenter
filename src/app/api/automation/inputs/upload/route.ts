import { NextResponse } from "next/server";

import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/audit/logger";
import {
  createAutomationInputFromUpload,
  type AutomationInputType,
} from "@/lib/automation/inputs";
import { assertValidCsrf } from "@/lib/security/csrf";
import { assertRateLimit } from "@/lib/security/rateLimit";

export async function POST(request: Request) {
  try {
    assertRateLimit(request, "automation-inputs-upload", {
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
    assertPermission(session, "automation.run");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const runbookId = String(formData.get("runbookId") || "").trim();
  const type = String(formData.get("type") || "").trim() as AutomationInputType;
  const file = formData.get("file");

  if (!runbookId || !type || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing runbookId, type, or file." },
      { status: 400 },
    );
  }

  if (type !== "campaign_recipients" && type !== "pronunciation_words") {
    return NextResponse.json({ error: "Invalid type." }, { status: 400 });
  }

  try {
    const automationInput = await createAutomationInputFromUpload({
      actor: session,
      runbookId,
      type,
      file,
    });

    await logAdminAction({
      actor: session,
      actionType: "automation.input.upload",
      resourceType: "automationInputs",
      resourceId: automationInput.id,
      requestPayloadRedacted: {
        runbookId,
        type,
        fileName: file.name,
      },
      result: "success",
    });

    return NextResponse.json({ automationInput }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Automation input upload failed";

    await logAdminAction({
      actor: session,
      actionType: "automation.input.upload",
      resourceType: "automationInputs",
      requestPayloadRedacted: {
        runbookId,
        type,
        fileName: file.name,
      },
      result: "failure",
      errorCode: "AUTOMATION_INPUT_UPLOAD_FAILED",
      errorMessage: message,
    });

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

