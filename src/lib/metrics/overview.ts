import "server-only";

import { Timestamp } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";

export type OverviewMetrics = {
  generatedAt: string;
  summary: {
    revenue30d: number | null;
    totalUsers: number;
    activeLearners: number;
    adminUsers: number;
    failedJobs24h: number;
    recentAuditEvents24h: number;
  };
};

async function safeCount(collectionName: string) {
  const db = getAdminDb();
  const aggregate = await db.collection(collectionName).count().get();
  return aggregate.data().count;
}

async function safeCountWhere(
  collectionName: string,
  field: string,
  op: FirebaseFirestore.WhereFilterOp,
  value: unknown,
) {
  const db = getAdminDb();
  const aggregate = await db
    .collection(collectionName)
    .where(field, op, value)
    .count()
    .get();
  return aggregate.data().count;
}

export async function getOverviewMetrics(): Promise<OverviewMetrics> {
  const now = Date.now();
  const cutoff24h = Timestamp.fromDate(new Date(now - 24 * 60 * 60 * 1000));

  const [
    totalUsers,
    activeLearners,
    adminUsers,
    failedJobs24h,
    recentAuditEvents24h,
  ] = await Promise.all([
    safeCount("users"),
    safeCountWhere("users", "status", "==", "active"),
    safeCount("adminUsers"),
    safeCountWhere("automationJobRuns", "status", "==", "failed"),
    safeCountWhere("adminActionAuditLogs", "createdAt", ">=", cutoff24h),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      revenue30d: null, // Stripe aggregation wiring comes in commerce phase.
      totalUsers,
      activeLearners,
      adminUsers,
      failedJobs24h,
      recentAuditEvents24h,
    },
  };
}
