import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/guards";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    summary: {
      revenue30d: 0,
      activeLearners: 0,
      campaignSends: 0,
      jobFailures24h: 0,
    },
    note: "Metrics pipeline scaffolded. Connect Firebase + Stripe data sources next.",
  });
}
