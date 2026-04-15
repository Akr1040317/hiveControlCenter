import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import type { AdminSession } from "@/types/auth";
import {
  getRunbookById,
  RUNBOOKS,
  type RunbookDefinition,
} from "@/lib/jobs/runbookRegistry";

export async function listRunbooks(): Promise<RunbookDefinition[]> {
  return RUNBOOKS;
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

  const record = {
    runbookId: runbook.id,
    requestedBy: input.actor.uid,
    requestedByEmail: input.actor.email,
    status: "completed",
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
