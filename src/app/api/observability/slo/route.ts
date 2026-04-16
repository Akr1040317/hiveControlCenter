import { NextResponse } from "next/server";

import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { getErrorMessage, reportAdminError } from "@/lib/observability/errorReporting";
import { getSloSnapshot } from "@/lib/observability/slo";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertPermission(session, "security.read");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const slo = await getSloSnapshot();
    return NextResponse.json(slo);
  } catch (error) {
    const message = getErrorMessage(error);
    await reportAdminError({
      source: "api",
      route: "/api/observability/slo",
      message,
      errorCode: "SLO_FETCH_FAILED",
      actorUid: session.uid,
      actorEmail: session.email,
      metadata: null,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
