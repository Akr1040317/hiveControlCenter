import "server-only";

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
