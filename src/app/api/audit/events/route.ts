import { NextResponse } from "next/server";

import { assertPermission, getAdminSession } from "@/lib/auth/guards";
import { getAdminDb } from "@/lib/firebase/admin";

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

  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection("adminActionAuditLogs")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({ events });
}
