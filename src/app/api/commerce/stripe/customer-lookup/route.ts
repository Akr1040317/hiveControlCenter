import { NextResponse } from "next/server";

import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { lookupStripeCustomers } from "@/lib/integrations/stripeAdmin";
import { getErrorMessage, reportAdminError } from "@/lib/observability/errorReporting";

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
    const message = getErrorMessage(error);
    await reportAdminError({
      source: "api",
      route: "/api/commerce/stripe/customer-lookup",
      message,
      errorCode: "STRIPE_CUSTOMER_LOOKUP_FAILED",
      actorUid: session.uid,
      actorEmail: session.email,
      metadata: { queryLength: query.length },
    });
    return NextResponse.json(
      { error: message },
      { status: 400 },
    );
  }
}
