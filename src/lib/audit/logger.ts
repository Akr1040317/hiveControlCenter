import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";
import type { AdminSession } from "@/types/auth";

type AuditResult = "success" | "failure";

type LogAdminActionInput = {
  actor: AdminSession;
  actionType: string;
  resourceType: string;
  resourceId?: string;
  requestPayloadRedacted?: Record<string, unknown>;
  beforeSnapshot?: Record<string, unknown> | null;
  afterSnapshot?: Record<string, unknown> | null;
  result: AuditResult;
  errorCode?: string;
  errorMessage?: string;
  ticketReference?: string;
};

export async function logAdminAction(input: LogAdminActionInput) {
  try {
    const adminDb = getAdminDb();
    await adminDb.collection("adminActionAuditLogs").add({
      actorUid: input.actor.uid,
      actorEmail: input.actor.email,
      actionType: input.actionType,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      requestPayloadRedacted: input.requestPayloadRedacted ?? null,
      beforeSnapshot: input.beforeSnapshot ?? null,
      afterSnapshot: input.afterSnapshot ?? null,
      result: input.result,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
      ticketReference: input.ticketReference ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
