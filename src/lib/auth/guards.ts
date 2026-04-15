import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isEmailAllowlisted } from "@/lib/auth/allowlist";
import {
  SESSION_COOKIE_NAME,
  verifyAdminSessionCookie,
} from "@/lib/auth/session";
import type { AdminPermission, AdminSession } from "@/types/auth";
import { hasPermission } from "@/lib/rbac/permissions";
import { getAdminUserByUid } from "@/lib/users/adminUsers";

async function toAdminSession(decoded: {
  uid: string;
  email?: string;
  role?: string;
  adminCenterRole?: string;
  adminCenterStatus?: string;
  name?: string;
}): Promise<AdminSession | null> {
  const email = decoded.email?.toLowerCase();
  if (!email || !isEmailAllowlisted(email)) {
    return null;
  }

  const adminUser = await getAdminUserByUid(decoded.uid);
  const status =
    adminUser?.status ??
    ((decoded.adminCenterStatus as AdminSession["status"]) || "active");

  if (status !== "active") {
    return null;
  }

  const roleFromClaims = (decoded.adminCenterRole ||
    decoded.role) as AdminSession["role"] | undefined;
  const role = adminUser?.role ?? roleFromClaims ?? "super_admin";

  return {
    uid: decoded.uid,
    email,
    name: decoded.name,
    role,
    status,
  };
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = await verifyAdminSessionCookie(token);
    return await toAdminSession(decoded);
  } catch {
    return null;
  }
}

export async function requireAdminSession(
  redirectPath = "/sign-in",
): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    redirect(redirectPath);
  }
  return session;
}

export function assertPermission(
  session: AdminSession,
  permission: AdminPermission,
) {
  if (!hasPermission(session.role, permission)) {
    throw new Error("FORBIDDEN");
  }
}
