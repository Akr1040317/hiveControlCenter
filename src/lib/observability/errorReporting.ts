import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";

type ErrorSeverity = "warning" | "error" | "critical";

type ReportAdminErrorInput = {
  source: string;
  route: string;
  message: string;
  errorCode?: string;
  severity?: ErrorSeverity;
  actorUid?: string | null;
  actorEmail?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === "string" ? error : "Unknown error";
}

export async function reportAdminError(input: ReportAdminErrorInput) {
  try {
    const db = getAdminDb();
    await db.collection("adminErrorEvents").add({
      source: input.source,
      route: input.route,
      message: input.message,
      errorCode: input.errorCode ?? null,
      severity: input.severity ?? "error",
      actorUid: input.actorUid ?? null,
      actorEmail: input.actorEmail ?? null,
      metadata: input.metadata ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (reportingError) {
    console.error("Failed to report admin error event", reportingError);
  }
}
