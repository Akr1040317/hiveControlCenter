import { NextResponse } from "next/server";

import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { listRecentJobs } from "@/lib/jobs/engine";
import { getRunbookById } from "@/lib/jobs/runbookRegistry";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertPermission(session, "campaigns.preview");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const jobs = await listRecentJobs(80);
  const campaigns = jobs.filter((job) => {
    const runbookId =
      typeof job.runbookId === "string" ? (job.runbookId as string) : "";
    const runbook = getRunbookById(runbookId);
    return runbook?.category === "campaigns";
  });

  return NextResponse.json({ campaigns, count: campaigns.length });
}
