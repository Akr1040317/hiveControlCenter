import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/guards";
import { CONTENT_MODULES } from "@/lib/content/modules";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ modules: CONTENT_MODULES, count: CONTENT_MODULES.length });
}
