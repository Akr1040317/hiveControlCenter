export type AdminRole =
  | "super_admin"
  | "ops_admin"
  | "marketing_admin"
  | "support_admin"
  | "finance_admin"
  | "viewer";

export type AdminPermission =
  | "users.read"
  | "users.write"
  | "users.entitlements.grant"
  | "campaigns.preview"
  | "campaigns.send"
  | "automation.run"
  | "automation.approve"
  | "automation.cancel"
  | "billing.read"
  | "billing.adjust"
  | "security.read"
  | "security.write";

export type AdminSession = {
  uid: string;
  email: string;
  role: AdminRole;
  status: "active" | "suspended";
  name?: string;
};
