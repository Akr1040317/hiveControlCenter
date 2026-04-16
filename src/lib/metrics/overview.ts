import "server-only";

import { Timestamp } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import {
  getStripeHealth,
  getStripeRevenueLast30DaysCents,
} from "@/lib/integrations/stripe";

export type OverviewMetrics = {
  generatedAt: string;
  summary: {
    revenue30d: number | null;
    stripeConnected: boolean;
    stripeLivemode: boolean;
    stripeError: string | null;
    totalUsers: number;
    activeLearners: number;
    adminUsers: number;
    activeSubscriptions: number;
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
    stripeHealth,
    stripeRevenue30dCents,
    totalUsers,
    activeLearners,
    adminUsers,
    activeSubscriptions,
    failedJobs24h,
    recentAuditEvents24h,
  ] = await Promise.all([
    getStripeHealth(),
    getStripeRevenueLast30DaysCents().catch(() => null),
    safeCount("users"),
    safeCountWhere("users", "status", "==", "active"),
    safeCount("adminUsers"),
    safeCountWhere("users", "subscriptionStatus", "==", "active"),
    safeCountWhere("automationJobRuns", "status", "==", "failed"),
    safeCountWhere("adminActionAuditLogs", "createdAt", ">=", cutoff24h),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      revenue30d:
        typeof stripeRevenue30dCents === "number"
          ? Math.round((stripeRevenue30dCents / 100) * 100) / 100
          : null,
      stripeConnected: stripeHealth.connected,
      stripeLivemode: stripeHealth.livemode,
      stripeError:
        stripeHealth.connected === false
          ? (stripeHealth.error ?? "Stripe unavailable")
          : null,
      totalUsers,
      activeLearners,
      adminUsers,
      activeSubscriptions,
      failedJobs24h,
      recentAuditEvents24h,
    },
  };
}
