import { NextResponse } from "next/server";

import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { lookupStripeCustomers } from "@/lib/integrations/stripeAdmin";

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
  const query = searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ customers: [], count: 0 });
  }

  try {
    const customers = await lookupStripeCustomers(query);
    return NextResponse.json({ customers, count: customers.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lookup failed" },
      { status: 400 },
    );
  }
}
