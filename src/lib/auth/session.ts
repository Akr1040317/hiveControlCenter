import "server-only";

import type { SessionCookieOptions } from "firebase-admin/auth";

import { isEmailAllowlisted } from "@/lib/auth/allowlist";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getAdminUserByUid, touchAdminLastLogin } from "@/lib/users/adminUsers";
import type { AdminRole, AdminSession } from "@/types/auth";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 12; // 12 hours

export const SESSION_COOKIE_NAME = "__hive_admin_session";

const defaultSessionCookieOptions: SessionCookieOptions = {
  expiresIn: SESSION_DURATION_MS,
};

function toAdminRole(claims: Record<string, unknown>): AdminRole {
  const role = claims.adminCenterRole ?? claims.role;
  if (typeof role === "string" && role.length > 0) {
    return role as AdminRole;
  }
  return "super_admin";
}

export async function createAdminSessionFromIdToken(idToken: string) {
  const adminAuth = getAdminAuth();
  const decoded = await adminAuth.verifyIdToken(idToken, true);
  const email = decoded.email?.toLowerCase();

  if (!email || !isEmailAllowlisted(email)) {
    throw new Error("UNAUTHORIZED_EMAIL");
  }

  const adminUser = await getAdminUserByUid(decoded.uid);
  if (adminUser?.status === "suspended") {
    throw new Error("SUSPENDED_ADMIN");
  }

  const sessionCookie = await adminAuth.createSessionCookie(
    idToken,
    defaultSessionCookieOptions,
  );

  await touchAdminLastLogin(decoded.uid);

  return {
    sessionCookie,
    session: {
      uid: decoded.uid,
      email,
      role: adminUser?.role ?? toAdminRole(decoded),
      status: adminUser?.status ?? "active",
      name: decoded.name,
    } satisfies AdminSession,
  };
}

export async function verifyAdminSessionCookie(sessionCookie: string) {
  const adminAuth = getAdminAuth();
  return adminAuth.verifySessionCookie(sessionCookie, true);
}
