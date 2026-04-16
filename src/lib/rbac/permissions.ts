import type { AdminPermission, AdminRole } from "@/types/auth";

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  super_admin: [
    "users.read",
    "users.write",
    "users.entitlements.grant",
    "campaigns.preview",
    "campaigns.send",
    "automation.run",
    "automation.approve",
    "automation.cancel",
    "billing.read",
    "billing.adjust",
    "security.read",
    "security.write",
    "content.read",
    "content.write",
  ],
  ops_admin: [
    "users.read",
    "users.write",
    "users.entitlements.grant",
    "automation.run",
    "automation.approve",
    "automation.cancel",
    "security.read",
    "content.read",
    "content.write",
  ],
  marketing_admin: ["campaigns.preview", "campaigns.send", "users.read", "content.read"],
  support_admin: ["users.read", "users.write", "security.read", "content.read"],
  finance_admin: ["billing.read", "billing.adjust", "security.read"],
  viewer: ["users.read", "campaigns.preview", "billing.read", "security.read", "content.read"],
};

export function getPermissionsForRole(role: AdminRole): AdminPermission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(
  role: AdminRole,
  permission: AdminPermission,
): boolean {
  return getPermissionsForRole(role).includes(permission);
}
