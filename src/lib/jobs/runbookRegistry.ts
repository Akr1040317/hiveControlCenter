import { z } from "zod";

import type { AdminPermission } from "@/types/auth";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type RunbookDefinition = {
  id: string;
  name: string;
  description: string;
  category: "campaigns" | "bee_ready" | "users" | "commerce" | "ops";
  requiredPermissions: AdminPermission[];
  riskLevel: RiskLevel;
  supportsDryRun: boolean;
  requiresApproval: boolean;
  parameterSchema: z.ZodType<unknown>;
};

export const RUNBOOKS: RunbookDefinition[] = [
  {
    id: "campaign.sendBeeReadyWeekN",
    name: "Send Bee Ready week campaign",
    description:
      "Prepares a Bee Ready weekly campaign payload and estimates audience impact.",
    category: "campaigns",
    requiredPermissions: ["campaigns.send", "automation.run"],
    riskLevel: "high",
    supportsDryRun: true,
    requiresApproval: true,
    parameterSchema: z.object({
      weekNumber: z.number().int().min(1).max(52),
      templateKey: z.string().min(1),
      audienceSegment: z.string().min(1),
      idempotencyKey: z.string().min(8),
    }),
  },
  {
    id: "beeready.announcement.create",
    name: "Create Buzzby announcement",
    description:
      "Creates or previews a Buzzby announcement for Bee Ready learners.",
    category: "bee_ready",
    requiredPermissions: ["automation.run"],
    riskLevel: "medium",
    supportsDryRun: true,
    requiresApproval: false,
    parameterSchema: z.object({
      title: z.string().min(5),
      message: z.string().min(10),
      cohort: z.string().min(1),
      idempotencyKey: z.string().min(8),
    }),
  },
  {
    id: "users.entitlement.grantBeeReady",
    name: "Grant Bee Ready entitlement",
    description:
      "Grants Bee Ready access to a user list and previews entitlement counts.",
    category: "users",
    requiredPermissions: ["users.entitlements.grant", "automation.run"],
    riskLevel: "high",
    supportsDryRun: true,
    requiresApproval: true,
    parameterSchema: z.object({
      emails: z.array(z.string().email()).min(1),
      entitlementPlan: z.string().min(2),
      idempotencyKey: z.string().min(8),
    }),
  },
];

export function getRunbookById(runbookId: string) {
  return RUNBOOKS.find((runbook) => runbook.id === runbookId) ?? null;
}
