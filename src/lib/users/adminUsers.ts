import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";
import type { AdminRole } from "@/types/auth";

export type AdminUserStatus = "active" | "suspended";

export type AdminUserRecord = {
  uid: string;
  email: string;
  displayName: string | null;
  role: AdminRole;
  status: AdminUserStatus;
  lastLoginAt?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export async function getAdminUserByUid(
  uid: string,
): Promise<AdminUserRecord | null> {
  const db = getAdminDb();
  const doc = await db.collection("adminUsers").doc(uid).get();
  if (!doc.exists) {
    return null;
  }

  const data = doc.data() as Record<string, unknown>;
  return {
    uid: doc.id,
    email: String(data.email ?? "").toLowerCase(),
    displayName: (data.displayName as string | null) ?? null,
    role: (data.role as AdminRole) ?? "super_admin",
    status: (data.status as AdminUserStatus) ?? "active",
    lastLoginAt: (data.lastLoginAt as string | null) ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function searchAdminUsers(query: string) {
  const db = getAdminDb();
  const snapshot = await db.collection("adminUsers").limit(200).get();
  const normalizedQuery = query.trim().toLowerCase();

  const users = snapshot.docs
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        uid: doc.id,
        email: String(data.email ?? "").toLowerCase(),
        displayName: (data.displayName as string | null) ?? null,
        role: (data.role as AdminRole) ?? "super_admin",
        status: (data.status as AdminUserStatus) ?? "active",
        lastLoginAt: (data.lastLoginAt as string | null) ?? null,
      } satisfies AdminUserRecord;
    })
    .filter((user) => {
      if (!normalizedQuery) {
        return true;
      }
      return (
        user.email.includes(normalizedQuery) ||
        String(user.displayName ?? "").toLowerCase().includes(normalizedQuery) ||
        user.uid.toLowerCase().includes(normalizedQuery)
      );
    })
    .sort((a, b) => a.email.localeCompare(b.email))
    .slice(0, 50);

  return users;
}

export async function upsertAdminUser(input: {
  uid: string;
  email: string;
  displayName?: string | null;
  role: AdminRole;
  status: AdminUserStatus;
}) {
  const db = getAdminDb();
  const auth = getAdminAuth();
  const normalizedEmail = input.email.toLowerCase();
  const userRef = db.collection("adminUsers").doc(input.uid);

  await userRef.set(
    {
      email: normalizedEmail,
      displayName: input.displayName ?? null,
      role: input.role,
      status: input.status,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  // Keep Firebase Auth custom claims additive so existing app claims remain.
  try {
    const user = await auth.getUser(input.uid);
    const claims = user.customClaims ?? {};
    await auth.setCustomUserClaims(input.uid, {
      ...claims,
      adminCenterRole: input.role,
      adminCenterStatus: input.status,
    });
  } catch (error) {
    console.error("Failed to set admin custom claims", error);
  }

  const updated = await userRef.get();
  return {
    uid: updated.id,
    ...(updated.data() as Record<string, unknown>),
  };
}

export async function touchAdminLastLogin(uid: string) {
  const db = getAdminDb();
  await db.collection("adminUsers").doc(uid).set(
    {
      lastLoginAt: new Date().toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
