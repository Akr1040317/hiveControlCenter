import { NextResponse } from "next/server";
import { z } from "zod";

import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/audit/logger";
import { resyncUserBillingState } from "@/lib/integrations/stripeAdmin";
import { assertRateLimit } from "@/lib/security/rateLimit";
import { assertValidCsrf } from "@/lib/security/csrf";

const resyncSchema = z.object({
  identifier: z.string().min(3),
  reason: z.string().min(6).max(400),
});

export async function POST(request: Request) {
  try {
    assertRateLimit(request, "commerce-stripe-resync", {
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
    assertPermission(session, "billing.adjust");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (process.env.ADMIN_CENTER_READ_ONLY_MODE === "true") {
    return NextResponse.json(
      { error: "Admin center is in read-only mode." },
      { status: 423 },
    );
  }

  const parsed = resyncSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const updated = await resyncUserBillingState({
      identifier: parsed.data.identifier,
      reason: parsed.data.reason,
      actorUid: session.uid,
      actorEmail: session.email,
    });

    await logAdminAction({
      actor: session,
      actionType: "billing.resyncStripeState",
      resourceType: "users",
      resourceId: updated.uid,
      requestPayloadRedacted: { identifier: parsed.data.identifier, reason: parsed.data.reason },
      afterSnapshot: {
        subscriptionStatus: updated.subscriptionStatus,
        stripeSubscriptionStatus: updated.stripeSubscriptionStatus,
        stripeCustomerId: updated.stripeCustomerId,
      },
      result: "success",
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    await logAdminAction({
      actor: session,
      actionType: "billing.resyncStripeState",
      resourceType: "users",
      requestPayloadRedacted: { identifier: parsed.data.identifier, reason: parsed.data.reason },
      result: "failure",
      errorCode: "BILLING_RESYNC_FAILED",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    const message = error instanceof Error ? error.message : "Resync failed";
    return NextResponse.json(
      { error: message },
      { status: message === "USER_NOT_FOUND" ? 404 : 400 },
    );
  }
}
