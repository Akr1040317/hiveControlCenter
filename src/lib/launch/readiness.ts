import "server-only";

import type { AdminPermission, AdminRole } from "@/types/auth";
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import { getSloSnapshot } from "@/lib/observability/slo";

export const LAUNCH_ROLES: AdminRole[] = [
  "super_admin",
  "ops_admin",
  "marketing_admin",
  "support_admin",
  "finance_admin",
  "viewer",
];

export const CRITICAL_PERMISSIONS: AdminPermission[] = [
  "users.write",
  "campaigns.send",
  "automation.run",
  "automation.approve",
  "billing.adjust",
  "security.write",
  "content.write",
];

export const STAGING_CHECKLIST = [
  "All required env vars set in production and preview (Firebase, Stripe, SMTP, automation toggles).",
  "Google auth login and logout tested from production domain.",
  "RBAC tested for each role with at least one read and one write path.",
  "Dry-run and live execution tested for campaigns, tools, and approvals.",
  "Commerce flows tested: sync-check, resync, payment failures, webhook health.",
  "Observability SLO page reviewed and no active stale-running alerts.",
  "Audit logs verified for sensitive mutations (users, billing, automation).",
  "Backup/rollback operator on-call and rollback command tested in staging.",
];

export const BACKUP_AND_ROLLBACK_PLAN = [
  "Before release, capture Firestore exports for users, adminUsers, automationJobRuns, adminActionAuditLogs.",
  "Create release tag in git and confirm Vercel deployment ID for quick promote/rollback.",
  "If incident occurs, set ADMIN_CENTER_READ_ONLY_MODE=true and redeploy immediately.",
  "If automation behavior is risky, set ADMIN_CENTER_AUTOMATION_ENABLED=false and redeploy.",
  "Rollback application to previous stable Vercel deployment.",
  "Restore affected Firestore collections from export if data mutations were incorrect.",
  "Publish post-incident note with root cause, impact window, and follow-up controls.",
];

export async function getLaunchReadinessSnapshot() {
  const slo = await getSloSnapshot();
  const roles = LAUNCH_ROLES.map((role) => ({
    role,
    permissions: getPermissionsForRole(role),
  }));

  const goLiveChecks = [
    {
      key: "reliability-success-rate",
      label: "Reliability success rate >= 97%",
      pass: slo.reliability.successRate24h >= 97,
      value: `${slo.reliability.successRate24h.toFixed(2)}%`,
    },
    {
      key: "stale-running-jobs",
      label: "No stale running jobs (>30m)",
      pass: slo.queueHealth.staleRunningOver30m === 0,
      value: String(slo.queueHealth.staleRunningOver30m),
    },
    {
      key: "webhook-signal",
      label: "Stripe webhook signal is fresh",
      pass: !slo.billing.staleWebhookSignal,
      value: slo.billing.staleWebhookSignal ? "stale" : "fresh",
    },
    {
      key: "error-volume",
      label: "Error event volume acceptable (< 20 / 24h)",
      pass: slo.security.errorEvents24h < 20,
      value: String(slo.security.errorEvents24h),
    },
  ];

  const overallReady = goLiveChecks.every((check) => check.pass);

  return {
    generatedAt: new Date().toISOString(),
    slo,
    roles,
    goLiveChecks,
    overallReady,
    stagingChecklist: STAGING_CHECKLIST,
    backupAndRollbackPlan: BACKUP_AND_ROLLBACK_PLAN,
  };
}
