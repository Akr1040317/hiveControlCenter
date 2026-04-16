import "server-only";

import nodemailer from "nodemailer";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";

import { getCampaignTemplateByKey } from "@/lib/campaigns/catalog";
import { getAutomationInputById } from "@/lib/automation/inputs";
import { getAdminDb, getAdminStorageBucket } from "@/lib/firebase/admin";

type ExecutionContext = {
  runbookId: string;
  payload: Record<string, unknown>;
  isDryRun: boolean;
};

export type ExecutionResult = {
  status: "completed" | "failed";
  outputSummary: string;
  logs: string[];
  command: string;
  exitCode: number;
  durationMs: number;
};

const MAX_LOG_LINES = 250;

function trimLogs(lines: string[]) {
  if (lines.length <= MAX_LOG_LINES) {
    return lines;
  }
  return lines.slice(lines.length - MAX_LOG_LINES);
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function extractEmailsFromText(input: string) {
  const matches = input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  return [...new Set(matches.map((value) => value.toLowerCase().trim()))];
}

function extractWordsFromText(input: string) {
  const matches = input.match(/[A-Za-z][A-Za-z'-]{1,34}/g) ?? [];
  return [...new Set(matches.map((value) => value.toLowerCase().trim()))];
}

async function loadCampaignRecipients(payload: Record<string, unknown>) {
  if (typeof payload.inputRefId === "string" && payload.inputRefId.trim()) {
    const inputDoc = await getAutomationInputById(payload.inputRefId.trim());
    if (!inputDoc) {
      throw new Error("INPUT_REF_NOT_FOUND");
    }
    return asStringArray(inputDoc.parsedData.emails);
  }

  const manualRecipients = asStringArray(payload.manualRecipients)
    .flatMap((item) => extractEmailsFromText(item));
  if (manualRecipients.length > 0) {
    return [...new Set(manualRecipients)];
  }

  return [];
}

function getSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || "587");
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";

  if (!host || !user || !pass) {
    throw new Error("MISSING_SMTP_CONFIG");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass: pass.replace(/\s+/g, "") },
  });
}

async function runCampaignWebinarStartingSoon(
  context: ExecutionContext,
): Promise<ExecutionResult> {
  const startedAt = Date.now();
  const logs: string[] = [];
  const templateKey = String(context.payload.templateKey ?? "");
  const template = getCampaignTemplateByKey(templateKey);
  if (!template) {
    return {
      status: "failed",
      outputSummary: `Unknown campaign template: ${templateKey}`,
      logs: [`Template key not found: ${templateKey}`],
      command: "campaign.sendWebinarStartingSoon",
      exitCode: 2,
      durationMs: 0,
    };
  }

  const recipients = await loadCampaignRecipients(context.payload);
  if (recipients.length === 0) {
    return {
      status: "failed",
      outputSummary:
        "No recipients provided. Upload CSV/PDF input or pass manual recipients.",
      logs: [
        "No recipients from inputRefId/manualRecipients.",
        "Audience-segment auto expansion is not configured yet.",
      ],
      command: "campaign.sendWebinarStartingSoon",
      exitCode: 2,
      durationMs: Date.now() - startedAt,
    };
  }

  const subject =
    template.name || "Starting soon: webinar reminder from Hive Control Center";
  const html = template.previewHtml;
  const text = "Your webinar is starting soon. Please check your registered join link.";

  logs.push(`Template: ${templateKey}`);
  logs.push(`Audience segment: ${String(context.payload.audienceSegment ?? "manual")}`);
  logs.push(`Recipients: ${recipients.length}`);

  if (context.isDryRun) {
    return {
      status: "completed",
      outputSummary: `Dry run complete. Would send ${recipients.length} reminder emails.`,
      logs: trimLogs(logs),
      command: "campaign.sendWebinarStartingSoon",
      exitCode: 0,
      durationMs: Date.now() - startedAt,
    };
  }

  try {
    const transporter = getSmtpTransporter();
    await transporter.verify();

    const fromAddress = process.env.FROM_EMAIL || process.env.SMTP_USER;
    if (!fromAddress) {
      throw new Error("MISSING_FROM_EMAIL");
    }

    let sentCount = 0;
    for (const email of recipients) {
      await transporter.sendMail({
        from: fromAddress,
        to: email,
        subject,
        html,
        text,
      });
      sentCount += 1;
      logs.push(`Sent ${sentCount}/${recipients.length}: ${email}`);
    }

    return {
      status: "completed",
      outputSummary: `Live send completed. Sent ${sentCount} webinar reminder emails.`,
      logs: trimLogs(logs),
      command: "campaign.sendWebinarStartingSoon",
      exitCode: 0,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    logs.push(error instanceof Error ? error.message : "Unknown SMTP error");
    return {
      status: "failed",
      outputSummary: "Campaign execution failed during SMTP send.",
      logs: trimLogs(logs),
      command: "campaign.sendWebinarStartingSoon",
      exitCode: 1,
      durationMs: Date.now() - startedAt,
    };
  }
}

async function findJsonWordDocumentId(word: string) {
  const db = getAdminDb();
  const variants = [word, word.toLowerCase(), word.charAt(0).toUpperCase() + word.slice(1)];
  for (const candidate of variants) {
    const doc = await db.collection("JSON").doc(candidate).get();
    if (doc.exists) {
      return candidate;
    }
  }
  return null;
}

function getTextToSpeechClient() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("MISSING_TTS_CREDENTIALS");
  }
  return new TextToSpeechClient({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });
}

async function runPronunciationGeneration(
  context: ExecutionContext,
): Promise<ExecutionResult> {
  const startedAt = Date.now();
  const logs: string[] = [];
  const provider = String(context.payload.provider ?? "google_tts");
  if (provider === "manual") {
    if (context.isDryRun) {
      return {
        status: "completed",
        outputSummary:
          "Dry run completed. Manual provider requires interactive tooling and was not executed.",
        logs: ["Skipped script execution for provider=manual (dry run)."],
        command: "tools.pronunciations.generate",
        exitCode: 0,
        durationMs: 0,
      };
    }
    return {
      status: "failed",
      outputSummary:
        "Live execution blocked: provider=manual requires interactive recording.",
      logs: [
        "Manual provider cannot run in automation mode. Use provider=google_tts for scripted runs.",
      ],
      command: "tools.pronunciations.generate",
      exitCode: 2,
      durationMs: 0,
    };
  }

  let words: string[] = [];
  if (typeof context.payload.inputRefId === "string" && context.payload.inputRefId) {
    const inputDoc = await getAutomationInputById(context.payload.inputRefId);
    if (!inputDoc) {
      throw new Error("INPUT_REF_NOT_FOUND");
    }
    words = asStringArray(inputDoc.parsedData.words);
  } else {
    words = asStringArray(context.payload.manualWords).flatMap(extractWordsFromText);
  }

  if (words.length === 0) {
    return {
      status: "failed",
      outputSummary: "No words found. Upload CSV/PDF or provide manual words.",
      logs: ["No processable words found in payload."],
      command: "tools.pronunciations.generate",
      exitCode: 2,
      durationMs: Date.now() - startedAt,
    };
  }
  if (words.length > 250) {
    words = words.slice(0, 250);
    logs.push("Input truncated to first 250 words for single-run safety.");
  }

  if (context.isDryRun) {
    return {
      status: "completed",
      outputSummary: `Dry run complete. Would process ${words.length} words.`,
      logs: trimLogs([
        ...logs,
        `Words selected: ${words.length}`,
        `Sample: ${words.slice(0, 15).join(", ")}`,
      ]),
      command: "tools.pronunciations.generate",
      exitCode: 0,
      durationMs: Date.now() - startedAt,
    };
  }

  try {
    const tts = getTextToSpeechClient();
    const db = getAdminDb();
    const bucket = getAdminStorageBucket();
    let updated = 0;
    let missing = 0;
    let failed = 0;

    for (const word of words) {
      const docId = await findJsonWordDocumentId(word);
      if (!docId) {
        missing += 1;
        logs.push(`Missing JSON doc: ${word}`);
        continue;
      }

      try {
        const [ttsResponse] = await tts.synthesizeSpeech({
          input: { text: word.toLowerCase() },
          voice: {
            languageCode: "en-US",
            name: "en-US-Neural2-F",
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 0.9,
          },
        });

        const audioContent = ttsResponse.audioContent;
        if (!audioContent) {
          failed += 1;
          logs.push(`TTS returned empty audio: ${word}`);
          continue;
        }

        const safeWord = word.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
        const filePath = `pronunciations/${safeWord}.mp3`;
        const file = bucket.file(filePath);
        await file.save(Buffer.from(audioContent as Uint8Array), {
          contentType: "audio/mpeg",
          resumable: false,
        });

        const [signedUrl] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
        });

        const ref = db.collection("JSON").doc(docId);
        const existing = await ref.get();
        const current = existing.data() ?? {};
        const pronunciations = asStringArray(current.pronunciations);
        const nextPronunciations = [signedUrl, ...pronunciations.filter((url) => url !== signedUrl)];
        await ref.set({ pronunciations: nextPronunciations }, { merge: true });
        updated += 1;
      } catch (error) {
        failed += 1;
        logs.push(`${word}: ${error instanceof Error ? error.message : "failed"}`);
      }
    }

    return {
      status: failed > 0 ? "failed" : "completed",
      outputSummary:
        failed > 0
          ? `Pronunciation run finished with errors. Updated ${updated}, failed ${failed}, missing ${missing}.`
          : `Pronunciation run completed. Updated ${updated} words.`,
      logs: trimLogs([
        ...logs,
        `Updated: ${updated}`,
        `Missing: ${missing}`,
        `Failed: ${failed}`,
      ]),
      command: "tools.pronunciations.generate",
      exitCode: failed > 0 ? 1 : 0,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    logs.push(error instanceof Error ? error.message : "Unknown error");
    return {
      status: "failed",
      outputSummary: "Pronunciation generation failed unexpectedly.",
      logs: trimLogs(logs),
      command: "tools.pronunciations.generate",
      exitCode: 1,
      durationMs: Date.now() - startedAt,
    };
  }
}

export async function executeRunbook(context: ExecutionContext) {
  if (context.runbookId === "campaign.sendWebinarStartingSoon") {
    return runCampaignWebinarStartingSoon(context);
  }
  if (context.runbookId === "tools.pronunciations.generate") {
    return runPronunciationGeneration(context);
  }

  return {
    status: "failed",
    outputSummary: `No executor registered for ${context.runbookId}.`,
    logs: [`Unsupported runbook: ${context.runbookId}`],
    command: "N/A",
    exitCode: 2,
    durationMs: 0,
  } satisfies ExecutionResult;
}

