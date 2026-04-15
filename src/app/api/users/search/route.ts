import { NextResponse } from "next/server";

import { getAdminSession, assertPermission } from "@/lib/auth/guards";
import { searchAdminUsers } from "@/lib/users/adminUsers";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertPermission(session, "users.read");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const role = searchParams.get("role")?.trim().toLowerCase();
  const status = searchParams.get("status")?.trim().toLowerCase();

  const users = (await searchAdminUsers(query)).filter((user) => {
    if (role && user.role !== role) {
      return false;
    }
    if (status && user.status !== status) {
      return false;
    }
    return true;
  });

  return NextResponse.json({ users, count: users.length });
}
