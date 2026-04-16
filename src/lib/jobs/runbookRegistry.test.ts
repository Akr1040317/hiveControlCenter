import { describe, expect, it } from "vitest";

import { getRunbookById, RUNBOOKS } from "@/lib/jobs/runbookRegistry";

const validPayloadByRunbookId: Record<string, Record<string, unknown>> = {
  "campaign.sendBeeReadyWeekN": {
    weekNumber: 2,
    templateKey: "week2",
    audienceSegment: "all-active",
    idempotencyKey: "idemp-week2-001",
  },
  "campaign.sendWebinarStartingSoon": {
    templateKey: "webinar-starting-soon",
    audienceSegment: "registrants",
    idempotencyKey: "idemp-webinar-001",
  },
  "campaign.sendBeeReadyRecapWebinar": {
    weekNumber: 2,
    templateKey: "week2-recap",
    audienceSegment: "all-active",
    idempotencyKey: "idemp-recap-001",
  },
  "beeready.announcement.create": {
    title: "Important update",
    message: "Webinar starts in 15 minutes.",
    cohort: "spring-2026",
    idempotencyKey: "idemp-announce-001",
  },
  "users.entitlement.grantBeeReady": {
    emails: ["test@example.com"],
    entitlementPlan: "bee-ready-pro",
    idempotencyKey: "idemp-entitlement-001",
  },
  "tools.quiz.addWords": {
    sourceFile: "manual-input",
    targetQuiz: "quiz-drop-1",
    idempotencyKey: "idemp-quiz-001",
  },
  "tools.pronunciations.generate": {
    wordSetRef: "manual-input",
    provider: "google_tts",
    manualWords: ["abate", "abide"],
    idempotencyKey: "idemp-pron-001",
  },
  "tools.wordInfo.generate": {
    source: "firestore",
    targetCollection: "JSON",
    idempotencyKey: "idemp-wordinfo-001",
  },
  "tools.learningTrack.rebuild": {
    trackId: "bee-ready-tier-0",
    cohort: "spring-2026",
    idempotencyKey: "idemp-track-001",
  },
};

describe("runbook registry", () => {
  it("has unique runbook ids", () => {
    const ids = RUNBOOKS.map((runbook) => runbook.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("can resolve every runbook id", () => {
    for (const runbook of RUNBOOKS) {
      expect(getRunbookById(runbook.id)?.id).toBe(runbook.id);
    }
  });

  it("accepts canonical valid payloads for all runbooks", () => {
    for (const runbook of RUNBOOKS) {
      const payload = validPayloadByRunbookId[runbook.id];
      expect(payload).toBeDefined();
      const parsed = runbook.parameterSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    }
  });

  it("rejects missing idempotencyKey for all runbooks", () => {
    for (const runbook of RUNBOOKS) {
      const payload = { ...validPayloadByRunbookId[runbook.id] };
      delete payload.idempotencyKey;
      const parsed = runbook.parameterSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
    }
  });
});
