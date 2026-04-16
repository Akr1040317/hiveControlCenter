import { NextResponse } from "next/server";

import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { listStripePaymentFailures } from "@/lib/integrations/stripeAdmin";

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
  const days = Number(searchParams.get("days") ?? 14);
  const clampedDays = Number.isFinite(days) ? Math.max(1, Math.min(90, days)) : 14;

  try {
    const failures = await listStripePaymentFailures(clampedDays);
    return NextResponse.json({ failures, count: failures.length, days: clampedDays });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list payment failures" },
      { status: 400 },
    );
  }
}
