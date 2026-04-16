import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/guards";
import { getAdminDb } from "@/lib/firebase/admin";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();

  const snap = await db
    .collection("automationJobRuns")
    .where("runbookId", "in", [
      "tools.quiz.addWords",
      "tools.pronunciations.generate",
      "tools.wordInfo.generate",
      "tools.learningTrack.rebuild",
    ])
    .orderBy("createdAt", "desc")
    .limit(30)
    .get();

  const runs = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      runbookId: data.runbookId,
      status: data.status,
      isDryRun: data.isDryRun,
      requestedByEmail: data.requestedByEmail,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
      completedAt: data.completedAt?.toDate?.()?.toISOString?.() ?? null,
      resultSummary: data.resultSummary ?? null,
    };
  });

  return NextResponse.json({ runs, count: runs.length });
}
