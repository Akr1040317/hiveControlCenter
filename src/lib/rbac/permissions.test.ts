import { describe, expect, it } from "vitest";

import { getPermissionsForRole, hasPermission } from "@/lib/rbac/permissions";

describe("RBAC permissions", () => {
  it("grants content.write to ops and super admins only", () => {
    expect(hasPermission("super_admin", "content.write")).toBe(true);
    expect(hasPermission("ops_admin", "content.write")).toBe(true);
    expect(hasPermission("marketing_admin", "content.write")).toBe(false);
    expect(hasPermission("viewer", "content.write")).toBe(false);
  });

  it("keeps finance admins scoped to billing/security permissions", () => {
    const permissions = getPermissionsForRole("finance_admin");
    expect(permissions).toContain("billing.read");
    expect(permissions).toContain("billing.adjust");
    expect(permissions).not.toContain("automation.run");
    expect(permissions).not.toContain("users.write");
  });
});
