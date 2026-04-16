import { NextResponse } from "next/server";

import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { getStripeSubscriptionSyncCheck } from "@/lib/integrations/stripeAdmin";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertPermission(session, "billing.read");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const identifier = searchParams.get("identifier")?.trim() ?? "";
  if (!identifier) {
    return NextResponse.json({ error: "Missing identifier" }, { status: 400 });
  }

  try {
    const result = await getStripeSubscriptionSyncCheck(identifier);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Sync check failed";
    return NextResponse.json(
      { error: message },
      { status: message === "USER_NOT_FOUND" ? 404 : 400 },
    );
  }
}
