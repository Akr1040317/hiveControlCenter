import { NextResponse } from "next/server";

import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { getStripeWebhookHealth } from "@/lib/integrations/stripeAdmin";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertPermission(session, "billing.read");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const health = await getStripeWebhookHealth();
  return NextResponse.json(health);
}
