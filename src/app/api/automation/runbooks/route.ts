import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/guards";
import { listRunbooks } from "@/lib/jobs/engine";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runbooks = await listRunbooks();
  return NextResponse.json({ runbooks });
}
