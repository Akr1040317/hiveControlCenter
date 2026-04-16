import "server-only";

import { FieldValue } from "firebase-admin/firestore";

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

async function executeJobNow(input: {
  jobId: string;
  runbookId: string;
  payload: Record<string, unknown>;
  isDryRun: boolean;
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
  }
}

export async function listRunbooks(): Promise<RunbookDefinition[]> {
  return RUNBOOKS;
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

  if (input.status === "approved") {
    const runbookId = String(current.runbookId ?? "");
    if (canExecuteRunbook(runbookId)) {
      const payload = (current.input ?? {}) as Record<string, unknown>;
      await executeJobNow({
        jobId: input.jobId,
        runbookId,
        payload,
        isDryRun: false,
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

  if (canExecuteNow && nextStatus !== "pending_approval") {
    await executeJobNow({
      jobId: jobRef.id,
      runbookId: runbook.id,
      payload: parsed.data as Record<string, unknown>,
      isDryRun,
    });
  }

  const finalizedDoc = await jobRef.get();

  return {
    id: finalizedDoc.id,
    ...(finalizedDoc.data() as Record<string, unknown>),
  };
}
