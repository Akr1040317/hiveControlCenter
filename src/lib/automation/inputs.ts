import "server-only";

import { PDFParse } from "pdf-parse";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb, getAdminStorageBucket } from "@/lib/firebase/admin";
import type { AdminSession } from "@/types/auth";

const SUPPORTED_EXTENSIONS = new Set(["csv", "txt", "pdf"]);

export type AutomationInputType = "campaign_recipients" | "pronunciation_words";

export type AutomationInputRecord = {
  id: string;
  type: AutomationInputType;
  runbookId: string;
  fileName: string;
  fileMimeType: string;
  fileSizeBytes: number;
  storagePath: string;
  parsedCount: number;
  parsedPreview: string[];
  parsedData: {
    emails?: string[];
    words?: string[];
  };
};

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getFileExtension(fileName: string) {
  const idx = fileName.lastIndexOf(".");
  if (idx === -1) {
    return "";
  }
  return fileName.slice(idx + 1).toLowerCase();
}

function extractEmails(text: string) {
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  return [...new Set(matches.map((email) => email.trim().toLowerCase()))];
}

function extractWords(text: string) {
  const matches = text.match(/[A-Za-z][A-Za-z'-]{1,34}/g) ?? [];
  return [...new Set(matches.map((word) => word.trim().toLowerCase()))];
}

function parseCsvFirstColumn(text: string) {
  const lines = text.split(/\r?\n/);
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(",")[0]?.trim() ?? "")
    .filter(Boolean);
}

async function extractTextFromFile(file: File, extension: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (extension === "pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const data = await parser.getText();
      return data.text || "";
    } finally {
      await parser.destroy();
    }
  }
  return buffer.toString("utf8");
}

export async function createAutomationInputFromUpload(input: {
  actor: AdminSession;
  runbookId: string;
  type: AutomationInputType;
  file: File;
}) {
  const extension = getFileExtension(input.file.name);
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error("UNSUPPORTED_FILE_TYPE");
  }
  if (input.file.size > 10 * 1024 * 1024) {
    throw new Error("FILE_TOO_LARGE");
  }

  const text = await extractTextFromFile(input.file, extension);
  const parsedValues =
    input.type === "campaign_recipients"
      ? extension === "csv"
        ? extractEmails(parseCsvFirstColumn(text).join("\n"))
        : extractEmails(text)
      : extension === "csv"
        ? extractWords(parseCsvFirstColumn(text).join("\n"))
        : extractWords(text);

  if (parsedValues.length === 0) {
    throw new Error("NO_VALID_VALUES_FOUND");
  }
  if (parsedValues.length > 5000) {
    throw new Error("TOO_MANY_VALUES");
  }

  const adminDb = getAdminDb();
  const docRef = adminDb.collection("automationInputs").doc();
  const safeFileName = sanitizeFileName(input.file.name);
  const storagePath = `automation-inputs/${docRef.id}/${Date.now()}-${safeFileName}`;

  const bucket = getAdminStorageBucket();
  const storageFile = bucket.file(storagePath);
  const bytes = Buffer.from(await input.file.arrayBuffer());
  await storageFile.save(bytes, {
    contentType: input.file.type || "application/octet-stream",
    resumable: false,
  });

  const payload = {
    type: input.type,
    runbookId: input.runbookId,
    fileName: input.file.name,
    fileMimeType: input.file.type || "application/octet-stream",
    fileSizeBytes: input.file.size,
    storagePath,
    parsedCount: parsedValues.length,
    parsedPreview: parsedValues.slice(0, 20),
    parsedData:
      input.type === "campaign_recipients"
        ? { emails: parsedValues }
        : { words: parsedValues },
    uploadedBy: input.actor.uid,
    uploadedByEmail: input.actor.email,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await docRef.set(payload);

  return {
    id: docRef.id,
    ...(payload as Omit<AutomationInputRecord, "id">),
  };
}

export async function getAutomationInputById(inputId: string) {
  const adminDb = getAdminDb();
  const doc = await adminDb.collection("automationInputs").doc(inputId).get();
  if (!doc.exists) {
    return null;
  }
  return { id: doc.id, ...doc.data() } as AutomationInputRecord;
}

