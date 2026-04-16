import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase/admin";

export type PlatformUserRecord = {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: string | null;
  status: string | null;
  tier: string | null;
};

export async function searchPlatformUsers(query: string) {
  const db = getAdminDb();
  const snapshot = await db.collection("users").limit(300).get();
  const normalizedQuery = query.trim().toLowerCase();

  const users = snapshot.docs
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        uid: doc.id,
        email: (data.email as string | null) ?? null,
        displayName: (data.displayName as string | null) ?? null,
        role: (data.role as string | null) ?? null,
        status: (data.status as string | null) ?? null,
        tier: (data.tier as string | null) ?? null,
      } satisfies PlatformUserRecord;
    })
    .filter((user) => {
      if (!normalizedQuery) {
        return true;
      }

      return (
        user.uid.toLowerCase().includes(normalizedQuery) ||
        String(user.email ?? "")
          .toLowerCase()
          .includes(normalizedQuery) ||
        String(user.displayName ?? "")
          .toLowerCase()
          .includes(normalizedQuery)
      );
    })
    .slice(0, 50);

  return users;
}

export async function updatePlatformUser(input: {
  uid: string;
  role: string;
  status: string;
  tier: string;
  reason: string;
  actorUid: string;
  actorEmail: string;
}) {
  const db = getAdminDb();
  const ref = db.collection("users").doc(input.uid);
  const existing = await ref.get();
  if (!existing.exists) {
    throw new Error("PLATFORM_USER_NOT_FOUND");
  }

  await ref.set(
    {
      role: input.role,
      status: input.status,
      tier: input.tier,
      adminLastUpdatedBy: input.actorUid,
      adminLastUpdatedByEmail: input.actorEmail,
      adminLastUpdateReason: input.reason,
      adminLastUpdatedAt: FieldValue.serverTimestamp(),
      lastUpdated: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const updated = await ref.get();
  const data = updated.data() as Record<string, unknown>;
  return {
    uid: updated.id,
    email: (data.email as string | null) ?? null,
    displayName: (data.displayName as string | null) ?? null,
    role: (data.role as string | null) ?? null,
    status: (data.status as string | null) ?? null,
    tier: (data.tier as string | null) ?? null,
  } satisfies PlatformUserRecord;
}

export async function bulkUpdatePlatformUsers(input: {
  updates: Array<{
    uid: string;
    role: string;
    status: string;
    tier: string;
  }>;
  reason: string;
  actorUid: string;
  actorEmail: string;
}) {
  const results: Array<{
    uid: string;
    ok: boolean;
    error?: string;
    user?: PlatformUserRecord;
  }> = [];

  for (const update of input.updates) {
    try {
      const user = await updatePlatformUser({
        ...update,
        reason: input.reason,
        actorUid: input.actorUid,
        actorEmail: input.actorEmail,
      });
      results.push({ uid: update.uid, ok: true, user });
    } catch (error) {
      results.push({
        uid: update.uid,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    total: input.updates.length,
    successCount: results.filter((result) => result.ok).length,
    failureCount: results.filter((result) => !result.ok).length,
    results,
  };
}
