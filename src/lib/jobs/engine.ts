import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import type { AdminSession } from "@/types/auth";
import {
  getRunbookById,
  RUNBOOKS,
  type RunbookDefinition,
} from "@/lib/jobs/runbookRegistry";

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

  const patch: Record<string, unknown> = {
    status: input.status,
    updatedAt: FieldValue.serverTimestamp(),
    latestActionBy: input.actorUid,
    latestActionByEmail: input.actorEmail,
    latestActionReason: input.reason,
  };

  if (input.status === "approved") {
    patch.approvedBy = input.actorUid;
    patch.approvedByEmail = input.actorEmail;
    patch.approvedAt = FieldValue.serverTimestamp();
  }

  if (input.status === "cancelled") {
    patch.cancelledBy = input.actorUid;
    patch.cancelledByEmail = input.actorEmail;
    patch.cancelledAt = FieldValue.serverTimestamp();
  }

  await ref.set(patch, { merge: true });
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
  const nextStatus = isDryRun ? "completed" : "queued";

  const record = {
    runbookId: runbook.id,
    requestedBy: input.actor.uid,
    requestedByEmail: input.actor.email,
    status: nextStatus,
    input: parsed.data,
    outputSummary: isDryRun
      ? "Dry run completed. No external side effects executed."
      : "Execution pipeline is scaffolded; live mode not enabled yet.",
    logsRef: null,
    isDryRun,
    startedAt: FieldValue.serverTimestamp(),
    endedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  };

  const jobRef = await adminDb.collection("automationJobRuns").add(record);

  return {
    id: jobRef.id,
    ...record,
  };
}
