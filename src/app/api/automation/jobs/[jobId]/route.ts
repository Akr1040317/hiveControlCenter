import { NextResponse } from "next/server";

import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { getJobById } from "@/lib/jobs/engine";

type RouteParams = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_: Request, context: RouteParams) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertPermission(session, "automation.run");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { jobId } = await context.params;
  const job = await getJobById(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({ job });
}
