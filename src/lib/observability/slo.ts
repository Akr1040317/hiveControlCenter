import "server-only";

import { Timestamp } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";

type JobDurationSample = {
  createdAtMs: number;
  endedAtMs: number;
};

function percentile(values: number[], p: number): number {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[index] ?? 0;
}

function toTimestampMs(value: unknown): number | null {
  const maybe = value as { toDate?: () => Date };
  if (maybe?.toDate) {
    return maybe.toDate().getTime();
  }
  return null;
}

export type SloSnapshot = {
  generatedAt: string;
  reliability: {
    totalJobs24h: number;
    failedJobs24h: number;
    successRate24h: number;
    p95JobDurationSeconds24h: number;
  };
  queueHealth: {
    pendingApproval: number;
    runningNow: number;
    staleRunningOver30m: number;
  };
  security: {
    auditEvents24h: number;
    errorEvents24h: number;
  };
  billing: {
    stripeWebhookEvents24h: number;
    stripeWebhookFailures24h: number;
    staleWebhookSignal: boolean;
  };
};

export async function getSloSnapshot(): Promise<SloSnapshot> {
  const db = getAdminDb();
  const now = Date.now();
  const cutoff24h = Timestamp.fromDate(new Date(now - 24 * 60 * 60 * 1000));
  const staleRunningCutoff = Timestamp.fromDate(new Date(now - 30 * 60 * 1000));
  const staleWebhookCutoff = Timestamp.fromDate(new Date(now - 6 * 60 * 60 * 1000));

  const [
    jobs24hSnap,
    failedJobs24hAgg,
    runningNowAgg,
    pendingApprovalAgg,
    staleRunningAgg,
    auditEvents24hAgg,
    errorEvents24hAgg,
    webhookEvents24hAgg,
    webhookFailures24hAgg,
    latestWebhookSnap,
  ] = await Promise.all([
    db
      .collection("automationJobRuns")
      .where("createdAt", ">=", cutoff24h)
      .orderBy("createdAt", "desc")
      .limit(500)
      .get(),
    db
      .collection("automationJobRuns")
      .where("status", "==", "failed")
      .where("createdAt", ">=", cutoff24h)
      .count()
      .get(),
    db
      .collection("automationJobRuns")
      .where("status", "==", "running")
      .count()
      .get(),
    db
      .collection("automationJobRuns")
      .where("status", "==", "pending_approval")
      .count()
      .get(),
    db
      .collection("automationJobRuns")
      .where("status", "==", "running")
      .where("startedAt", "<=", staleRunningCutoff)
      .count()
      .get(),
    db
      .collection("adminActionAuditLogs")
      .where("createdAt", ">=", cutoff24h)
      .count()
      .get(),
    db
      .collection("adminErrorEvents")
      .where("createdAt", ">=", cutoff24h)
      .count()
      .get(),
    db
      .collection("stripeWebhookEvents")
      .where("receivedAt", ">=", cutoff24h)
      .count()
      .get(),
    db
      .collection("stripeWebhookEvents")
      .where("receivedAt", ">=", cutoff24h)
      .where("status", "==", "failed")
      .count()
      .get(),
    db.collection("stripeWebhookEvents").orderBy("receivedAt", "desc").limit(1).get(),
  ]);

  const totalJobs24h = jobs24hSnap.size;
  const failedJobs24h = failedJobs24hAgg.data().count;
  const successRate24h =
    totalJobs24h > 0
      ? Math.max(0, ((totalJobs24h - failedJobs24h) / totalJobs24h) * 100)
      : 100;

  const durationSamples: JobDurationSample[] = jobs24hSnap.docs
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const createdAtMs = toTimestampMs(data.createdAt);
      const endedAtMs = toTimestampMs(data.endedAt);
      if (!createdAtMs || !endedAtMs || endedAtMs < createdAtMs) {
        return null;
      }
      return { createdAtMs, endedAtMs };
    })
    .filter((sample): sample is JobDurationSample => sample !== null);

  const p95JobDurationSeconds24h = Math.round(
    percentile(
      durationSamples.map((sample) => (sample.endedAtMs - sample.createdAtMs) / 1000),
      95,
    ),
  );

  const latestWebhookData = latestWebhookSnap.docs[0]?.data() as
    | Record<string, unknown>
    | undefined;
  const latestWebhookTs = toTimestampMs(latestWebhookData?.receivedAt);
  const staleWebhookSignal =
    latestWebhookTs === null || latestWebhookTs < staleWebhookCutoff.toDate().getTime();

  return {
    generatedAt: new Date().toISOString(),
    reliability: {
      totalJobs24h,
      failedJobs24h,
      successRate24h: Math.round(successRate24h * 100) / 100,
      p95JobDurationSeconds24h,
    },
    queueHealth: {
      pendingApproval: pendingApprovalAgg.data().count,
      runningNow: runningNowAgg.data().count,
      staleRunningOver30m: staleRunningAgg.data().count,
    },
    security: {
      auditEvents24h: auditEvents24hAgg.data().count,
      errorEvents24h: errorEvents24hAgg.data().count,
    },
    billing: {
      stripeWebhookEvents24h: webhookEvents24hAgg.data().count,
      stripeWebhookFailures24h: webhookFailures24hAgg.data().count,
      staleWebhookSignal,
    },
  };
}
