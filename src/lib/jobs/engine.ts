import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import type { AdminSession } from "@/types/auth";
import {
  getRunbookById,
  RUNBOOKS,
  type RunbookDefinition,
} from "@/lib/jobs/runbookRegistry";

const EXECUTABLE_RUNBOOKS = new Set([
  "campaign.sendWebinarStartingSoon",
  "tools.pronunciations.generate",
]);

function canExecuteRunbook(runbookId: string) {
  return EXECUTABLE_RUNBOOKS.has(runbookId);
}

export type AutomationJobRecord = {
  id: string;
  runbookId?: string;
  status?: string;
  requestedBy?: string;
  requestedByEmail?: string;
  isDryRun?: boolean;
  input?: Record<string, unknown>;
  outputSummary?: string | null;
  [key: string]: unknown;
};

export type AutomationJobEventRecord = {
  id: string;
  type: string;
  message: string;
  actorUid?: string | null;
  actorEmail?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: unknown;
  [key: string]: unknown;
};

async function addJobEvent(input: {
  jobId: string;
  type: string;
  message: string;
  actorUid?: string | null;
  actorEmail?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const adminDb = getAdminDb();
  await adminDb
    .collection("automationJobRuns")
    .doc(input.jobId)
    .collection("events")
    .add({
      type: input.type,
      message: input.message,
      actorUid: input.actorUid ?? null,
      actorEmail: input.actorEmail ?? null,
      metadata: input.metadata ?? {},
      createdAt: FieldValue.serverTimestamp(),
    });
}

async function executeJobNow(input: {
  jobId: string;
  runbookId: string;
  payload: Record<string, unknown>;
  isDryRun: boolean;
  actorUid?: string;
  actorEmail?: string;
}) {
  const adminDb = getAdminDb();
  const ref = adminDb.collection("automationJobRuns").doc(input.jobId);
  await ref.set(
    {
      status: "running",
      startedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      outputSummary: "Execution started.",
    },
    { merge: true },
  );
  await addJobEvent({
    jobId: input.jobId,
    type: "execution.started",
    message: `Execution started (${input.isDryRun ? "dry run" : "live"}).`,
    actorUid: input.actorUid,
    actorEmail: input.actorEmail,
    metadata: { runbookId: input.runbookId, isDryRun: input.isDryRun },
  });

  try {
    const { executeRunbook } = await import("@/lib/jobs/executors");
    const result = await executeRunbook({
      runbookId: input.runbookId,
      payload: input.payload,
      isDryRun: input.isDryRun,
    });
    await ref.set(
      {
        status: result.status,
        outputSummary: result.outputSummary,
        execution: {
          command: result.command,
          exitCode: result.exitCode,
          durationMs: result.durationMs,
          logs: result.logs,
        },
        endedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await addJobEvent({
      jobId: input.jobId,
      type: result.status === "completed" ? "execution.completed" : "execution.failed",
      message: result.outputSummary,
      actorUid: input.actorUid,
      actorEmail: input.actorEmail,
      metadata: {
        command: result.command,
        exitCode: result.exitCode,
        durationMs: result.durationMs,
      },
    });
  } catch (error) {
    await ref.set(
      {
        status: "failed",
        outputSummary: "Runbook execution crashed before completion.",
        execution: {
          command: "N/A",
          exitCode: -1,
          durationMs: 0,
          logs: [
            error instanceof Error ? error.message : "Unknown execution error",
          ],
        },
        endedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await addJobEvent({
      jobId: input.jobId,
      type: "execution.failed",
      message: "Runbook execution crashed before completion.",
      actorUid: input.actorUid,
      actorEmail: input.actorEmail,
      metadata: {
        error: error instanceof Error ? error.message : "Unknown execution error",
      },
    });
  }
}

export async function listRunbooks(): Promise<RunbookDefinition[]> {
  return RUNBOOKS;
}

export type AutomationOpsOverview = {
  generatedAt: string;
  liveExecutionEnabled: boolean;
  pendingApproval: number;
  runningJobs: number;
  failedJobs24h: number;
  queuedJobs: number;
};

export type AutomationAlert = {
  id: string;
  severity: "high" | "medium";
  type: "job_failed" | "job_running_stale" | "job_pending_approval_stale";
  jobId: string;
  runbookId: string;
  message: string;
  createdAtLabel: string;
};

export async function getAutomationOpsOverview(): Promise<AutomationOpsOverview> {
  const adminDb = getAdminDb();
  const now = Date.now();
  const cutoff24h = Timestamp.fromDate(new Date(now - 24 * 60 * 60 * 1000));
  const liveExecutionEnabled =
    process.env.ADMIN_CENTER_AUTOMATION_ENABLED !== "false";

  const [pendingApproval, runningJobs, failedJobs24h, queuedJobs] =
    await Promise.all([
      adminDb
        .collection("automationJobRuns")
        .where("status", "==", "pending_approval")
        .count()
        .get()
        .then((agg) => agg.data().count),
      adminDb
        .collection("automationJobRuns")
        .where("status", "==", "running")
        .count()
        .get()
        .then((agg) => agg.data().count),
      adminDb
        .collection("automationJobRuns")
        .where("status", "==", "failed")
        .where("updatedAt", ">=", cutoff24h)
        .count()
        .get()
        .then((agg) => agg.data().count),
      adminDb
        .collection("automationJobRuns")
        .where("status", "==", "queued")
        .count()
        .get()
        .then((agg) => agg.data().count),
    ]);

  return {
    generatedAt: new Date().toISOString(),
    liveExecutionEnabled,
    pendingApproval,
    runningJobs,
    failedJobs24h,
    queuedJobs,
  };
}

function getIsoLabel(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return "unknown";
    }
  }
  if (typeof value === "string") {
    return value;
  }
  return "unknown";
}

export async function getAutomationAlerts(limit = 20): Promise<AutomationAlert[]> {
  const adminDb = getAdminDb();
  const now = Date.now();
  const staleRunningCutoff = Timestamp.fromDate(new Date(now - 30 * 60 * 1000));
  const staleApprovalCutoff = Timestamp.fromDate(new Date(now - 6 * 60 * 60 * 1000));

  const [failedSnapshot, staleRunningSnapshot, staleApprovalSnapshot] =
    await Promise.all([
      adminDb
        .collection("automationJobRuns")
        .where("status", "==", "failed")
        .orderBy("updatedAt", "desc")
        .limit(limit)
        .get(),
      adminDb
        .collection("automationJobRuns")
        .where("status", "==", "running")
        .where("startedAt", "<=", staleRunningCutoff)
        .orderBy("startedAt", "asc")
        .limit(limit)
        .get(),
      adminDb
        .collection("automationJobRuns")
        .where("status", "==", "pending_approval")
        .where("createdAt", "<=", staleApprovalCutoff)
        .orderBy("createdAt", "asc")
        .limit(limit)
        .get(),
    ]);

  const alerts: AutomationAlert[] = [];

  for (const doc of failedSnapshot.docs) {
    const data = doc.data();
    alerts.push({
      id: `failed:${doc.id}`,
      severity: "high",
      type: "job_failed",
      jobId: doc.id,
      runbookId: String(data.runbookId ?? "unknown"),
      message: String(data.outputSummary ?? "Job failed without summary."),
      createdAtLabel: getIsoLabel(data.updatedAt ?? data.createdAt),
    });
  }

  for (const doc of staleRunningSnapshot.docs) {
    const data = doc.data();
    alerts.push({
      id: `running:${doc.id}`,
      severity: "high",
      type: "job_running_stale",
      jobId: doc.id,
      runbookId: String(data.runbookId ?? "unknown"),
      message: "Job has been running for over 30 minutes.",
      createdAtLabel: getIsoLabel(data.startedAt ?? data.createdAt),
    });
  }

  for (const doc of staleApprovalSnapshot.docs) {
    const data = doc.data();
    alerts.push({
      id: `approval:${doc.id}`,
      severity: "medium",
      type: "job_pending_approval_stale",
      jobId: doc.id,
      runbookId: String(data.runbookId ?? "unknown"),
      message: "Pending approval for over 6 hours.",
      createdAtLabel: getIsoLabel(data.createdAt),
    });
  }

  return alerts.slice(0, limit);
}

export async function listRecentJobs(limit = 20): Promise<AutomationJobRecord[]> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection("automationJobRuns")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as AutomationJobRecord,
  );
}

export async function getJobById(
  jobId: string,
): Promise<AutomationJobRecord | null> {
  const adminDb = getAdminDb();
  const doc = await adminDb.collection("automationJobRuns").doc(jobId).get();
  if (!doc.exists) {
    return null;
  }
  return { id: doc.id, ...doc.data() } as AutomationJobRecord;
}

export async function getJobEvents(
  jobId: string,
  limit = 100,
): Promise<AutomationJobEventRecord[]> {
  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection("automationJobRuns")
    .doc(jobId)
    .collection("events")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as AutomationJobEventRecord,
  );
}

export async function updateJobStatus(input: {
  jobId: string;
  status: "approved" | "cancelled";
  actorUid: string;
  actorEmail: string;
  reason: string;
}) {
  const adminDb = getAdminDb();
  const ref = adminDb.collection("automationJobRuns").doc(input.jobId);
  const doc = await ref.get();
  if (!doc.exists) {
    throw new Error("JOB_NOT_FOUND");
  }
  const current = doc.data() as AutomationJobRecord;

  const patch: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    latestActionBy: input.actorUid,
    latestActionByEmail: input.actorEmail,
    latestActionReason: input.reason,
  };

  if (input.status === "approved") {
    if (current.isDryRun) {
      throw new Error("DRY_RUN_CANNOT_BE_APPROVED");
    }
    if (String(current.status ?? "") === "cancelled") {
      throw new Error("JOB_ALREADY_CANCELLED");
    }

    patch.status = "approved";
    patch.approvedBy = input.actorUid;
    patch.approvedByEmail = input.actorEmail;
    patch.approvedAt = FieldValue.serverTimestamp();
  }

  if (input.status === "cancelled") {
    if (
      String(current.status ?? "") === "completed" ||
      String(current.status ?? "") === "failed"
    ) {
      throw new Error("JOB_ALREADY_FINALIZED");
    }
    patch.status = "cancelled";
    patch.cancelledBy = input.actorUid;
    patch.cancelledByEmail = input.actorEmail;
    patch.cancelledAt = FieldValue.serverTimestamp();
    patch.endedAt = FieldValue.serverTimestamp();
  }

  await ref.set(patch, { merge: true });
  await addJobEvent({
    jobId: input.jobId,
    type: input.status === "approved" ? "approval.approved" : "approval.cancelled",
    message:
      input.status === "approved"
        ? `Approved: ${input.reason}`
        : `Cancelled: ${input.reason}`,
    actorUid: input.actorUid,
    actorEmail: input.actorEmail,
    metadata: { reason: input.reason },
  });

  if (input.status === "approved") {
    const runbookId = String(current.runbookId ?? "");
    if (canExecuteRunbook(runbookId)) {
      const payload = (current.input ?? {}) as Record<string, unknown>;
      await executeJobNow({
        jobId: input.jobId,
        runbookId,
        payload,
        isDryRun: false,
        actorUid: input.actorUid,
        actorEmail: input.actorEmail,
      });
    } else {
      await ref.set(
        {
          status: "queued",
          outputSummary:
            "Approved. No executor registered yet; job remains queued for future worker support.",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      await addJobEvent({
        jobId: input.jobId,
        type: "execution.queued",
        message: "Approved but no executor registered. Job remains queued.",
        actorUid: input.actorUid,
        actorEmail: input.actorEmail,
      });
    }
  }

  const updated = await ref.get();
  return { id: updated.id, ...updated.data() } as AutomationJobRecord;
}

export async function createDryRunJob(input: {
  actor: AdminSession;
  runbookId: string;
  payload: unknown;
  isDryRun?: boolean;
}) {
  const runbook = getRunbookById(input.runbookId);
  if (!runbook) {
    throw new Error("RUNBOOK_NOT_FOUND");
  }

  const parsed = runbook.parameterSchema.safeParse(input.payload);
  if (!parsed.success) {
    throw new Error("INVALID_RUNBOOK_INPUT");
  }

  const isDryRun = input.isDryRun ?? true;
  const liveExecutionEnabled =
    process.env.ADMIN_CENTER_AUTOMATION_ENABLED !== "false";
  if (!isDryRun && !liveExecutionEnabled) {
    throw new Error("AUTOMATION_DISABLED");
  }
  const adminDb = getAdminDb();
  const canExecuteNow = canExecuteRunbook(runbook.id);
  const nextStatus = isDryRun
    ? canExecuteNow
      ? "running"
      : "completed"
    : runbook.requiresApproval
      ? "pending_approval"
      : canExecuteNow
        ? "running"
        : "queued";

  const record = {
    runbookId: runbook.id,
    requestedBy: input.actor.uid,
    requestedByEmail: input.actor.email,
    status: nextStatus,
    input: parsed.data,
    outputSummary:
      nextStatus === "pending_approval"
        ? "Queued. Waiting for admin approval before live execution."
        : nextStatus === "queued"
          ? "Queued. No executor registered yet for live execution."
          : isDryRun && !canExecuteNow
            ? "Dry run completed. No external side effects executed."
            : "Execution queued.",
    logsRef: null,
    isDryRun,
    startedAt: nextStatus === "pending_approval" ? null : FieldValue.serverTimestamp(),
    endedAt: null,
    createdAt: FieldValue.serverTimestamp(),
  };

  const jobRef = await adminDb.collection("automationJobRuns").add(record);
  await addJobEvent({
    jobId: jobRef.id,
    type: "job.created",
    message: `Job created with status ${nextStatus}.`,
    actorUid: input.actor.uid,
    actorEmail: input.actor.email,
    metadata: { runbookId: runbook.id, isDryRun },
  });

  if (canExecuteNow && nextStatus !== "pending_approval") {
    await executeJobNow({
      jobId: jobRef.id,
      runbookId: runbook.id,
      payload: parsed.data as Record<string, unknown>,
      isDryRun,
      actorUid: input.actor.uid,
      actorEmail: input.actor.email,
    });
  }

  const finalizedDoc = await jobRef.get();

  return {
    id: finalizedDoc.id,
    ...(finalizedDoc.data() as Record<string, unknown>),
  };
}

export async function retryJob(input: {
  actor: AdminSession;
  jobId: string;
  reason: string;
}) {
  const original = await getJobById(input.jobId);
  if (!original) {
    throw new Error("JOB_NOT_FOUND");
  }

  const status = String(original.status ?? "");
  if (status !== "failed" && status !== "cancelled") {
    throw new Error("JOB_NOT_RETRYABLE");
  }
  if (!original.isDryRun && process.env.ADMIN_CENTER_AUTOMATION_ENABLED === "false") {
    throw new Error("AUTOMATION_DISABLED");
  }

  const runbookId = String(original.runbookId ?? "");
  if (!runbookId) {
    throw new Error("JOB_RUNBOOK_MISSING");
  }

  const newJob = await createDryRunJob({
    actor: input.actor,
    runbookId,
    payload: (original.input ?? {}) as Record<string, unknown>,
    isDryRun: Boolean(original.isDryRun),
  });

  const adminDb = getAdminDb();
  const originalRef = adminDb.collection("automationJobRuns").doc(input.jobId);
  await originalRef.set(
    {
      retriedAt: FieldValue.serverTimestamp(),
      retriedBy: input.actor.uid,
      retriedByEmail: input.actor.email,
      retryReason: input.reason,
      retryJobId: newJob.id,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await addJobEvent({
    jobId: input.jobId,
    type: "job.retried",
    message: `Job retried as ${newJob.id}. Reason: ${input.reason}`,
    actorUid: input.actor.uid,
    actorEmail: input.actor.email,
    metadata: { retryJobId: newJob.id },
  });

  return newJob;
}
