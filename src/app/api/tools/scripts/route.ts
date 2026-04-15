import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/guards";
import { SCRIPT_CATALOG } from "@/lib/tools/scriptCatalog";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const area = searchParams.get("area");
  const source = searchParams.get("source");
  const query = searchParams.get("q")?.trim().toLowerCase() ?? "";

  const scripts = SCRIPT_CATALOG.filter((script) => {
    if (area && script.area !== area) {
      return false;
    }
    if (source && script.source !== source) {
      return false;
    }
    if (!query) {
      return true;
    }
    return (
      script.name.toLowerCase().includes(query) ||
      script.description.toLowerCase().includes(query) ||
      script.path.toLowerCase().includes(query)
    );
  });

  return NextResponse.json({ scripts, count: scripts.length });
}
