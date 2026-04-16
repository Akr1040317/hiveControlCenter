import { z } from "zod";

import type { AdminPermission } from "@/types/auth";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type RunbookDefinition = {
  id: string;
  name: string;
  description: string;
  category:
    | "campaigns"
    | "bee_ready"
    | "users"
    | "commerce"
    | "ops"
    | "content"
    | "tooling";
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
    id: "campaign.sendWebinarStartingSoon",
    name: "Send webinar starting soon campaign",
    description:
      "Schedules or dry-runs webinar starting-soon reminder sends for registrants.",
    category: "campaigns",
    requiredPermissions: ["campaigns.send", "automation.run"],
    riskLevel: "high",
    supportsDryRun: true,
    requiresApproval: true,
    parameterSchema: z.object({
      templateKey: z.string().min(1),
      audienceSegment: z.string().min(1),
      inputRefId: z.string().min(1).optional(),
      manualRecipients: z.array(z.string().email()).optional(),
      idempotencyKey: z.string().min(8),
    }),
  },
  {
    id: "campaign.sendBeeReadyRecapWebinar",
    name: "Send Bee Ready recap + webinar campaign",
    description:
      "Sends Bee Ready recap and webinar follow-up for active cohorts.",
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
  {
    id: "tools.quiz.addWords",
    name: "Add words to quizzes",
    description:
      "Runs script-backed quiz-word ingestion with validation and dry-run summary.",
    category: "tooling",
    requiredPermissions: ["automation.run"],
    riskLevel: "high",
    supportsDryRun: true,
    requiresApproval: true,
    parameterSchema: z.object({
      sourceFile: z.string().min(3),
      targetQuiz: z.string().min(1),
      idempotencyKey: z.string().min(8),
    }),
  },
  {
    id: "tools.pronunciations.generate",
    name: "Generate pronunciations",
    description:
      "Runs pronunciation generation pipeline for selected word sets.",
    category: "tooling",
    requiredPermissions: ["automation.run"],
    riskLevel: "medium",
    supportsDryRun: true,
    requiresApproval: false,
    parameterSchema: z.object({
      wordSetRef: z.string().min(1),
      provider: z.enum(["google_tts", "manual"]).default("google_tts"),
      inputRefId: z.string().min(1).optional(),
      manualWords: z.array(z.string().min(1)).optional(),
      idempotencyKey: z.string().min(8),
    }),
  },
  {
    id: "tools.wordInfo.generate",
    name: "Generate word information",
    description:
      "Builds and syncs word-level metadata (definitions, examples, CSV exports).",
    category: "tooling",
    requiredPermissions: ["automation.run"],
    riskLevel: "medium",
    supportsDryRun: true,
    requiresApproval: false,
    parameterSchema: z.object({
      source: z.enum(["csv", "json", "firestore"]),
      targetCollection: z.string().min(1),
      idempotencyKey: z.string().min(8),
    }),
  },
  {
    id: "tools.learningTrack.rebuild",
    name: "Rebuild learning tracks",
    description:
      "Regenerates learning track path structures and validates content links.",
    category: "content",
    requiredPermissions: ["automation.run"],
    riskLevel: "high",
    supportsDryRun: true,
    requiresApproval: true,
    parameterSchema: z.object({
      trackId: z.string().min(1),
      cohort: z.string().min(1),
      idempotencyKey: z.string().min(8),
    }),
  },
];

export function getRunbookById(runbookId: string) {
  return RUNBOOKS.find((runbook) => runbook.id === runbookId) ?? null;
}
