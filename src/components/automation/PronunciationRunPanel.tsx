"use client";

import { FormEvent, useState } from "react";

import { getCsrfToken } from "@/lib/client/csrf";

export function PronunciationRunPanel() {
  const [provider, setProvider] = useState<"google_tts" | "manual">("google_tts");
  const [wordSetRef, setWordSetRef] = useState("manual-input");
  const [manualWords, setManualWords] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(`pron-${Date.now()}`);
  const [isDryRun, setIsDryRun] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingInput, setIsUploadingInput] = useState(false);
  const [uploadedInputRefId, setUploadedInputRefId] = useState<string>("");
  const [uploadedWordCount, setUploadedWordCount] = useState<number | null>(null);

  const parseWords = () =>
    [...manualWords.matchAll(/[A-Za-z][A-Za-z'-]{1,34}/g)].map((match) =>
      match[0].toLowerCase(),
    );

  const handleInputUpload = async (file: File | null) => {
    if (!file) {
      return;
    }
    setIsUploadingInput(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("runbookId", "tools.pronunciations.generate");
      formData.append("type", "pronunciation_words");
      formData.append("file", file);

      const response = await fetch("/api/automation/inputs/upload", {
        method: "POST",
        headers: {
          "x-csrf-token": await getCsrfToken(),
        },
        body: formData,
      });
      const payload = (await response.json()) as {
        error?: string;
        automationInput?: { id: string; parsedCount?: number };
      };
      if (!response.ok) {
        throw new Error(payload.error || "Upload failed");
      }
      setUploadedInputRefId(payload.automationInput?.id || "");
      setUploadedWordCount(payload.automationInput?.parsedCount ?? null);
      setMessage("Word list uploaded and parsed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploadingInput(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/automation/jobs", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": await getCsrfToken(),
        },
        body: JSON.stringify({
          runbookId: "tools.pronunciations.generate",
          isDryRun,
          payload: {
            provider,
            wordSetRef,
            idempotencyKey,
            inputRefId: uploadedInputRefId || undefined,
            manualWords: parseWords(),
          },
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        job?: { id: string; status?: string };
      };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create pronunciation job");
      }
      setMessage(
        `Pronunciation job created (${payload.job?.id || "unknown"} / ${payload.job?.status || "created"}).`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to create pronunciation job",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <article className="hive-card p-4">
      <h2 className="text-base font-medium text-white">Pronunciation runbook</h2>
      <p className="mt-1 text-sm hive-subtle">
        Manual mode supports direct pasted words or CSV/PDF/TXT uploads.
      </p>
      <form onSubmit={handleSubmit} className="mt-3 grid gap-3 md:grid-cols-2">
        <select
          value={provider}
          onChange={(event) => setProvider(event.target.value as "google_tts" | "manual")}
          className="hive-input px-3 py-2 text-sm"
        >
          <option value="google_tts">google_tts</option>
          <option value="manual">manual</option>
        </select>
        <input
          value={wordSetRef}
          onChange={(event) => setWordSetRef(event.target.value)}
          className="hive-input px-3 py-2 text-sm"
          placeholder="Word set ref"
          required
        />
        <input
          value={idempotencyKey}
          onChange={(event) => setIdempotencyKey(event.target.value)}
          className="hive-input px-3 py-2 text-sm"
          placeholder="Idempotency key"
          required
        />
        <label className="flex items-center gap-2 text-sm text-[#dcdcef]">
          <input
            type="checkbox"
            checked={isDryRun}
            onChange={(event) => setIsDryRun(event.target.checked)}
          />
          Dry run
        </label>
        <textarea
          value={manualWords}
          onChange={(event) => setManualWords(event.target.value)}
          className="hive-input md:col-span-2 min-h-24 px-3 py-2 text-xs"
          placeholder="Manual words (space/comma/newline separated)"
        />
        <input
          type="file"
          accept=".csv,.pdf,.txt"
          onChange={(event) => void handleInputUpload(event.target.files?.[0] ?? null)}
          className="hive-input md:col-span-2 px-3 py-2 text-xs"
        />
        {isUploadingInput ? (
          <p className="md:col-span-2 text-xs text-[#a4a4be]">Uploading input...</p>
        ) : null}
        {uploadedInputRefId ? (
          <p className="md:col-span-2 text-xs text-[#a4a4be]">
            Uploaded input ref: {uploadedInputRefId}
            {typeof uploadedWordCount === "number"
              ? ` (${uploadedWordCount} parsed words)`
              : ""}
          </p>
        ) : null}
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="hive-primary-btn px-4 py-2 text-sm disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Create Pronunciation Job"}
          </button>
        </div>
      </form>
      {message ? <p className="mt-3 text-sm text-[#dcdcef]">{message}</p> : null}
    </article>
  );
}

