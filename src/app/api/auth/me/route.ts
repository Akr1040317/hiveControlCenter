import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/guards";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    uid: session.uid,
    email: session.email,
    role: session.role,
    status: session.status,
    name: session.name ?? null,
  });
}
