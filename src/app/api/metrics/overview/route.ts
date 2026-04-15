import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/guards";
import { getOverviewMetrics } from "@/lib/metrics/overview";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const metrics = await getOverviewMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load metrics.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
